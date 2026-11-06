import { Router } from 'express'
import path from 'node:path'
import { z } from 'zod'
import { pool } from '../db/pool'
import { getSetting, getSettings } from '../db/settings'
import { buildQuote, cartItemSchema, deliveryFeeFor } from '../lib/pricing'
import { optionalCustomer, requireAuth, requireCustomer, type AuthedRequest } from '../middleware/auth'
import { HttpError } from '../middleware/errorHandler'
import { rateLimit } from '../middleware/rateLimit'
import { PRIVATE_DIR, proofUpload, safeUnlink } from '../middleware/upload'
import { generateArticleCode, generateLoyaltyCode, generateOrderRef, normalisePhone } from '../utils/refs'

export const ordersRouter = Router()

export const ORDER_STATUSES = [
  'pending-price',
  'awaiting-payment',
  'payment-verified',
  'in-production',
  'quality-check',
  'ready-for-dispatch',
  'dispatched',
  'delivered',
  'cancelled',
] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

// Allowed manual transitions. "payment-verified" is deliberately absent as a
// target: the ONLY way into it is POST /:id/verify-payment, so production can
// never start before a person has checked the bank transfer.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'pending-price': ['awaiting-payment', 'cancelled'],
  'awaiting-payment': ['cancelled'],
  'payment-verified': ['in-production', 'cancelled'],
  'in-production': ['quality-check'],
  'quality-check': ['ready-for-dispatch', 'in-production'],
  'ready-for-dispatch': ['dispatched', 'quality-check'],
  dispatched: ['delivered', 'ready-for-dispatch'],
  delivered: [],
  cancelled: [],
}

const lookupLimiter = rateLimit({ windowMs: 60_000, max: 15 })
const checkoutLimiter = rateLimit({ windowMs: 60_000, max: 10 })

// ── Shared helpers ───────────────────────────────────────────
async function loadOrderBundle(orderId: string) {
  const [items, articles] = await Promise.all([
    pool.query(`SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`, [orderId]),
    pool.query(
      `SELECT code, order_item_id, piece_index, product_name, purchase_date, status FROM article_codes
       WHERE order_id = $1 ORDER BY created_at, piece_index`,
      [orderId],
    ),
  ])
  return { items: items.rows, articles: articles.rows }
}

// What a customer is allowed to see about their own order.
async function customerView(order: Record<string, any>) {
  const { items, articles } = await loadOrderBundle(order.id)
  const showBank = ['awaiting-payment'].includes(order.order_status) && order.payment_status !== 'verified'
  return {
    ref: order.ref,
    createdAt: order.created_at,
    customerName: order.customer_name,
    phone: order.phone,
    address: { street: order.street, area: order.area, city: order.city, province: order.province },
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    paymentNote: order.payment_status === 'flagged' ? order.payment_note : null,
    proofUploadedAt: order.proof_uploaded_at,
    subtotal: order.subtotal_pkr,
    testingFees: order.testing_fees_pkr,
    delivery: order.delivery_pkr,
    discount: order.discount_pkr,
    total: order.total_pkr,
    promoCode: order.promo_code,
    courier: order.courier_name
      ? { name: order.courier_name, trackingNumber: order.tracking_number, trackingUrl: order.tracking_url, dispatchDate: order.dispatch_date }
      : null,
    deliveredAt: order.delivered_at,
    items: items.map((i: Record<string, any>) => ({
      id: i.id,
      name: i.product_name,
      sku: i.sku,
      size: i.size,
      qty: i.qty,
      unitPrice: i.unit_price_pkr,
      gemstoneTesting: i.gemstone_testing,
      testingFee: i.testing_fee_pkr,
      isCustom: i.is_custom,
      customDetails: i.custom_details,
    })),
    // Article numbers exist only after payment verification.
    articles: articles.filter((a: { status: string }) => a.status === 'active').map((a: Record<string, any>) => ({
      code: a.code,
      itemId: a.order_item_id,
      pieceIndex: a.piece_index,
      productName: a.product_name,
    })),
    bankDetails: showBank ? await getSetting('bank_details', null) : null,
  }
}

async function findByRefAndPhone(ref: string, phone: string) {
  const { rows } = await pool.query(`SELECT * FROM orders WHERE ref = $1 AND phone = $2`, [ref.trim().toUpperCase(), normalisePhone(phone)])
  return rows[0] ?? null
}

// ── Public: live quote for the bag / checkout ────────────────
const quoteSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(30),
  city: z.string().max(80).optional(),
  promoCode: z.string().max(40).optional(),
  phone: z.string().max(30).optional(),
})

ordersRouter.post('/quote', async (req, res) => {
  const body = quoteSchema.parse(req.body)
  const q = await buildQuote({ ...body, phone: body.phone ? normalisePhone(body.phone) : undefined })
  res.json({
    subtotal: q.subtotal,
    testingFees: q.testingFees,
    delivery: body.city ? q.delivery : null,
    discount: q.discount,
    total: q.total,
    promo: q.promo,
    lines: q.lines.map((l) => ({ productId: l.product.id, size: l.size, qty: l.qty, unitPrice: l.product.price_pkr, gemstoneTesting: l.gemstoneTesting, testingFee: l.testingFeePkr })),
  })
})

ordersRouter.get('/delivery-fee', async (req, res) => {
  res.json({ fee: await deliveryFeeFor(String(req.query.city ?? '')) })
})

// ── Public: place an order (guest or signed-in) ──────────────
const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(10).max(20),
    email: z.string().trim().email().optional().or(z.literal('')),
    street: z.string().trim().min(3).max(300),
    area: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(80),
    province: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
  items: z.array(cartItemSchema).min(1).max(30),
  promoCode: z.string().max(40).optional(),
  acceptPolicies: z.literal(true, { message: 'Please accept the delivery and returns policy' }),
})

ordersRouter.post('/', checkoutLimiter, optionalCustomer, async (req: AuthedRequest, res) => {
  const body = checkoutSchema.parse(req.body)
  const phone = normalisePhone(body.customer.phone)
  if (!/^92\d{10}$/.test(phone)) throw new HttpError(400, 'Please enter a valid Pakistani mobile number, e.g. 0300 1234567')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Prices, fees, delivery and discount are all recomputed here. The
    // promo row is locked so concurrent orders cannot over-redeem it.
    const q = await buildQuote({ items: body.items, city: body.customer.city, promoCode: body.promoCode, phone }, client, true)
    if (body.promoCode?.trim() && !q.promo?.applied) throw new HttpError(400, q.promo?.message ?? 'Promotional code could not be applied')

    let ref = generateOrderRef()
    while ((await client.query(`SELECT 1 FROM orders WHERE ref = $1`, [ref])).rowCount) ref = generateOrderRef()

    const { rows } = await client.query(
      `INSERT INTO orders (ref, customer_id, customer_name, phone, email, street, area, city, province, delivery_notes,
         subtotal_pkr, testing_fees_pkr, delivery_pkr, discount_pkr, total_pkr, promo_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        ref, req.customer?.id ?? null, body.customer.name, phone, body.customer.email || null,
        body.customer.street, body.customer.area || null, body.customer.city, body.customer.province || null,
        body.customer.notes || null, q.subtotal, q.testingFees, q.delivery, q.discount, q.total,
        q.promoRow?.code ?? null,
      ],
    )
    const order = rows[0]

    for (const l of q.lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, sku, product_name, category, size, qty, unit_price_pkr, gemstone_testing, testing_fee_pkr)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [order.id, l.product.id, l.product.sku, l.product.name, l.product.category, l.size, l.qty, l.product.price_pkr, l.gemstoneTesting, l.testingFeePkr],
      )
    }

    if (q.promoRow) {
      await client.query(`UPDATE promo_codes SET redemption_count = redemption_count + 1 WHERE code = $1`, [q.promoRow.code])
      await client.query(`INSERT INTO promo_redemptions (code, order_id, phone, amount_pkr) VALUES ($1,$2,$3,$4)`, [
        q.promoRow.code, order.id, phone, q.discount,
      ])
      if (q.promoRow.kind === 'loyalty') {
        await client.query(`UPDATE loyalty_rewards SET redeemed_at = now(), redeemed_order = $2 WHERE code = $1`, [q.promoRow.code, order.id])
      }
    }

    await client.query('COMMIT')
    res.status(201).json(await customerView(order))
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// ── Public: secure order lookup (reference + phone on file) ──
ordersRouter.post('/lookup', lookupLimiter, async (req, res) => {
  const { ref, phone } = z.object({ ref: z.string().min(4).max(40), phone: z.string().min(5).max(30) }).parse(req.body)
  const order = await findByRefAndPhone(ref, phone)
  if (!order) return res.status(404).json({ error: 'No order matches that order number and phone number' })
  res.json(await customerView(order))
})

// ── Public: upload bank-transfer receipt ─────────────────────
// Uploading moves payment to "proof-submitted" ONLY. It never touches
// order_status, so a receipt can never trigger production by itself.
ordersRouter.post('/:ref/payment-proof', lookupLimiter, proofUpload.single('proof'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Please choose your receipt to upload' })
  try {
    const order = await findByRefAndPhone(String(req.params.ref), String(req.body.phone ?? ''))
    if (!order) throw new HttpError(404, 'No order matches that order number and phone number')
    if (order.order_status !== 'awaiting-payment' || order.payment_status === 'verified') {
      throw new HttpError(409, 'This order is not awaiting payment')
    }
    const { rows } = await pool.query(
      `UPDATE orders SET payment_proof_path = $1, proof_uploaded_at = now(), payment_status = 'proof-submitted', updated_at = now()
       WHERE id = $2 RETURNING *`,
      [file.filename, order.id],
    )
    safeUnlink(PRIVATE_DIR, order.payment_proof_path)
    res.json(await customerView(rows[0]))
  } catch (err) {
    safeUnlink(PRIVATE_DIR, file.filename)
    throw err
  }
})

// ── Customer account: order history ──────────────────────────
ordersRouter.get('/mine', requireCustomer, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT ref, created_at, order_status, payment_status, total_pkr,
       (SELECT count(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o WHERE customer_id = $1 ORDER BY created_at DESC`,
    [req.customer!.id],
  )
  res.json(rows)
})

ordersRouter.get('/mine/:ref', requireCustomer, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(`SELECT * FROM orders WHERE ref = $1 AND customer_id = $2`, [req.params.ref, req.customer!.id])
  if (!rows[0]) return res.status(404).json({ error: 'Order not found' })
  res.json(await customerView(rows[0]))
})

// ══ Admin ════════════════════════════════════════════════════
ordersRouter.get('/', requireAuth, async (req, res) => {
  const { status, paymentStatus, search } = req.query as Record<string, string | undefined>
  const clauses: string[] = ['1=1']
  const params: unknown[] = []
  if (status) { params.push(status); clauses.push(`order_status = $${params.length}`) }
  if (paymentStatus) { params.push(paymentStatus); clauses.push(`payment_status = $${params.length}`) }
  if (search) {
    params.push(`%${search.trim()}%`)
    const p = `$${params.length}`
    clauses.push(`(ref ILIKE ${p} OR customer_name ILIKE ${p} OR phone ILIKE ${p} OR email ILIKE ${p} OR tracking_number ILIKE ${p})`)
  }
  const { rows } = await pool.query(
    `SELECT o.*, (SELECT count(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 500`,
    params,
  )
  res.json(rows.map(({ payment_proof_path, ...o }) => ({ ...o, has_proof: !!payment_proof_path })))
})

ordersRouter.get('/admin/:ref', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM orders WHERE ref = $1`, [req.params.ref])
  const order = rows[0]
  if (!order) return res.status(404).json({ error: 'Order not found' })
  const [{ items }, articles, history, reward, redemptions] = await Promise.all([
    loadOrderBundle(order.id),
    pool.query(`SELECT * FROM article_codes WHERE order_id = $1 ORDER BY created_at, piece_index`, [order.id]),
    pool.query(
      `SELECT ref, created_at, order_status, payment_status, total_pkr FROM orders WHERE phone = $1 AND id <> $2 ORDER BY created_at DESC`,
      [order.phone, order.id],
    ),
    pool.query(`SELECT * FROM loyalty_rewards WHERE customer_phone = $1`, [order.phone]),
    pool.query(`SELECT * FROM promo_redemptions WHERE order_id = $1`, [order.id]),
  ])
  const { payment_proof_path, ...rest } = order
  res.json({
    ...rest,
    has_proof: !!payment_proof_path,
    proof_is_pdf: payment_proof_path?.toLowerCase().endsWith('.pdf') ?? false,
    items,
    articles: articles.rows,
    history: history.rows,
    loyalty_reward: reward.rows[0] ?? null,
    redemptions: redemptions.rows,
  })
})

// Payment receipts are private: streamed only to signed-in admins.
ordersRouter.get('/:id/payment-proof', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT payment_proof_path FROM orders WHERE id = $1`, [req.params.id])
  const file = rows[0]?.payment_proof_path
  if (!file) return res.status(404).json({ error: 'No payment proof uploaded' })
  res.setHeader('Cache-Control', 'private, no-store')
  res.sendFile(path.join(PRIVATE_DIR, path.basename(file)))
})

// Verify payment → generates one article number per physical piece.
ordersRouter.post('/:id/verify-payment', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [req.params.id])
    const order = rows[0]
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.payment_status === 'verified') throw new HttpError(409, 'Payment is already verified')
    if (order.order_status !== 'awaiting-payment') {
      throw new HttpError(409, order.order_status === 'pending-price' ? 'Confirm the price first (move the order to Awaiting Payment)' : 'Only orders awaiting payment can be verified')
    }

    await client.query(
      `UPDATE orders SET payment_status = 'verified', payment_note = NULL, order_status = 'payment-verified',
         verified_at = now(), verified_by = $1, updated_at = now() WHERE id = $2`,
      [req.admin!.id, order.id],
    )

    const { rows: items } = await client.query(`SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`, [order.id])
    const purchaseDate = new Date()
    const codes: { code: string; productName: string }[] = []
    for (const item of items) {
      for (let piece = 1; piece <= item.qty; piece++) {
        let code = generateArticleCode()
        while ((await client.query(`SELECT 1 FROM article_codes WHERE code = $1`, [code])).rowCount) code = generateArticleCode()
        await client.query(
          `INSERT INTO article_codes (code, order_id, order_item_id, piece_index, product_name, customer_name, purchase_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (order_item_id, piece_index) DO NOTHING`,
          [code, order.id, item.id, piece, item.product_name, order.customer_name, purchaseDate],
        )
        codes.push({ code, productName: item.product_name })
      }
    }

    await client.query('COMMIT')
    res.json({ ok: true, articleCodes: codes })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

ordersRouter.post('/:id/flag-payment', requireAuth, async (req, res) => {
  const { note } = z.object({ note: z.string().trim().min(3).max(500) }).parse(req.body)
  const { rows } = await pool.query(
    `UPDATE orders SET payment_status = 'flagged', payment_note = $2, updated_at = now()
     WHERE id = $1 AND payment_status <> 'verified' RETURNING id`,
    [req.params.id, note],
  )
  if (!rows[0]) throw new HttpError(409, 'Order not found or payment already verified')
  res.json({ ok: true })
})

const courierSchema = z.object({
  courierName: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  dispatchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
})

ordersRouter.patch('/:id/status', requireAuth, async (req, res) => {
  const body = courierSchema.extend({ orderStatus: z.enum(ORDER_STATUSES) }).parse(req.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [req.params.id])
    const order = rows[0]
    if (!order) throw new HttpError(404, 'Order not found')

    const from = order.order_status as OrderStatus
    if (!TRANSITIONS[from].includes(body.orderStatus)) {
      const hint = body.orderStatus === 'payment-verified' ? ' Use “Verify payment” instead.' : ''
      throw new HttpError(409, `Cannot move an order from “${from}” to “${body.orderStatus}”.${hint}`)
    }
    // Belt and braces: nothing past payment-verified without a verified payment.
    const productionStages: OrderStatus[] = ['in-production', 'quality-check', 'ready-for-dispatch', 'dispatched', 'delivered']
    if (productionStages.includes(body.orderStatus) && order.payment_status !== 'verified') {
      throw new HttpError(409, 'Production cannot start before the payment has been verified')
    }

    const courierName = body.courierName || order.courier_name
    const trackingNumber = body.trackingNumber || order.tracking_number
    const trackingUrl = body.trackingUrl || order.tracking_url
    let dispatchDate = body.dispatchDate || order.dispatch_date
    if (body.orderStatus === 'dispatched') {
      if (!courierName || !trackingNumber) throw new HttpError(400, 'Enter the courier company and tracking number to mark as dispatched')
      dispatchDate = dispatchDate || new Date().toISOString().slice(0, 10)
    }

    const { rows: updated } = await client.query(
      `UPDATE orders SET order_status = $2, courier_name = $3, tracking_number = $4, tracking_url = $5, dispatch_date = $6,
         delivered_at = CASE WHEN $2 = 'delivered' THEN now() ELSE delivered_at END, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [order.id, body.orderStatus, courierName, trackingNumber, trackingUrl, dispatchDate],
    )
    // A cancelled order's article numbers stop verifying.
    if (body.orderStatus === 'cancelled') {
      await client.query(`UPDATE article_codes SET status = 'void', updated_at = now() WHERE order_id = $1`, [order.id])
    }
    await client.query('COMMIT')
    res.json(updated[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

ordersRouter.patch('/:id/courier', requireAuth, async (req, res) => {
  const b = courierSchema.parse(req.body)
  const { rows } = await pool.query(
    `UPDATE orders SET courier_name = $2, tracking_number = $3, tracking_url = $4, dispatch_date = $5, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, b.courierName || null, b.trackingNumber || null, b.trackingUrl || null, b.dispatchDate || null],
  )
  if (!rows[0]) throw new HttpError(404, 'Order not found')
  res.json(rows[0])
})

ordersRouter.patch('/:id/notes', requireAuth, async (req, res) => {
  const { adminNotes } = z.object({ adminNotes: z.string().max(5000) }).parse(req.body)
  const { rows } = await pool.query(`UPDATE orders SET admin_notes = $2, updated_at = now() WHERE id = $1 RETURNING id`, [req.params.id, adminNotes])
  if (!rows[0]) throw new HttpError(404, 'Order not found')
  res.json({ ok: true })
})

// While a custom order is "Pending Price", the owner can finalise the quote.
ordersRouter.patch('/:id/price', requireAuth, async (req, res) => {
  const body = z
    .object({ lines: z.array(z.object({ id: z.string().uuid(), unitPricePkr: z.number().int().nonnegative() })).min(1), deliveryPkr: z.number().int().nonnegative().optional() })
    .parse(req.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [req.params.id])
    const order = rows[0]
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.order_status !== 'pending-price') throw new HttpError(409, 'Prices can only be changed while the order is Pending Price')
    for (const l of body.lines) {
      await client.query(`UPDATE order_items SET unit_price_pkr = $3 WHERE id = $1 AND order_id = $2`, [l.id, order.id, l.unitPricePkr])
    }
    const { rows: items } = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [order.id])
    const subtotal = items.reduce((s: number, i: { unit_price_pkr: number; qty: number }) => s + i.unit_price_pkr * i.qty, 0)
    const testing = items.reduce((s: number, i: { testing_fee_pkr: number; qty: number }) => s + i.testing_fee_pkr * i.qty, 0)
    const delivery = body.deliveryPkr ?? order.delivery_pkr
    const total = Math.max(0, subtotal + testing + delivery - order.discount_pkr)
    const { rows: updated } = await client.query(
      `UPDATE orders SET subtotal_pkr = $2, testing_fees_pkr = $3, delivery_pkr = $4, total_pkr = $5, updated_at = now() WHERE id = $1 RETURNING *`,
      [order.id, subtotal, testing, delivery, total],
    )
    await client.query('COMMIT')
    res.json(updated[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// ── Loyalty: 5% next-order reward ────────────────────────────
// Trigger (defined once, here): the customer's first order that reaches
// "delivered". UNIQUE(customer_phone) on loyalty_rewards guarantees a
// customer can never receive it twice.
ordersRouter.post('/:id/loyalty', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id])
    const order = rows[0]
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.order_status !== 'delivered') throw new HttpError(409, 'The reward is issued once an order has been delivered')
    const existing = await client.query(`SELECT code FROM loyalty_rewards WHERE customer_phone = $1`, [order.phone])
    if (existing.rows[0]) throw new HttpError(409, `This customer already received a reward (${existing.rows[0].code})`)

    const s = await getSettings(['loyalty_percent', 'loyalty_valid_days'], client)
    const percent = Number(s.loyalty_percent ?? 5)
    const days = Number(s.loyalty_valid_days ?? 90)
    let code = generateLoyaltyCode()
    while ((await client.query(`SELECT 1 FROM promo_codes WHERE code = $1`, [code])).rowCount) code = generateLoyaltyCode()

    await client.query(
      `INSERT INTO promo_codes (code, description, kind, discount_type, discount_value, max_redemptions, per_phone_limit, restricted_phone, expires_at)
       VALUES ($1, $2, 'loyalty', 'percent', $3, 1, 1, $4, now() + ($5 || ' days')::interval)`,
      [code, `${percent}% thank-you reward for ${order.customer_name}`, percent, order.phone, String(days)],
    )
    const { rows: reward } = await client.query(
      `INSERT INTO loyalty_rewards (customer_phone, customer_name, code, issued_for_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [order.phone, order.customer_name, code, order.id],
    )
    await client.query('COMMIT')
    res.status(201).json({ ...reward[0], percent, valid_days: days })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

ordersRouter.post('/loyalty/:code/sent', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`UPDATE loyalty_rewards SET sent_at = now() WHERE code = $1 RETURNING *`, [req.params.code])
  if (!rows[0]) throw new HttpError(404, 'Reward not found')
  res.json(rows[0])
})
