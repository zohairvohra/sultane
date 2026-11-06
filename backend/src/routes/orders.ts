import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { upload } from '../middleware/upload'
import { generateOrderRef, generateArticleCode } from '../utils/refs'
import { getSetting } from '../db/settings'

export const ordersRouter = Router()

const checkoutSchema = z.object({
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
    street: z.string().min(1),
    area: z.string().optional(),
    city: z.string().min(1),
    province: z.string().min(1),
    postalCode: z.string().optional(),
    notes: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        size: z.string().optional(),
        qty: z.number().int().positive(),
        gemstoneTesting: z.boolean().optional(),
      }),
    )
    .min(1),
  paymentMethod: z.enum(['cod', 'bank-transfer']),
  promoCode: z.string().optional(),
})

// Public: create an order. All prices are recomputed server-side —
// the client never gets to dictate totals.
ordersRouter.post('/', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const body = checkoutSchema.parse(req.body)

    const productIds = body.items.map((i) => i.productId)
    const { rows: products } = await client.query(
      `SELECT * FROM products WHERE id = ANY($1::uuid[]) AND published = true`,
      [productIds],
    )
    if (products.length !== new Set(productIds).size) {
      return res.status(400).json({ error: 'One or more items are no longer available' })
    }

    const testingFeePkr = Number(await getSetting('gemstone_testing_fee_pkr', 799))
    let subtotal = 0
    let testingFees = 0
    const lineRows = body.items.map((item) => {
      const product = products.find((p: { id: string }) => p.id === item.productId)!
      subtotal += product.price_pkr * item.qty
      const testing = !!item.gemstoneTesting && product.has_gemstone
      if (testing) testingFees += testingFeePkr * item.qty
      return { product, item, testing }
    })

    const karachiFee = Number(await getSetting('delivery_fee_karachi_pkr', 0))
    const otherFee = Number(await getSetting('delivery_fee_other_pkr', 450))
    const defaultFee = Number(await getSetting('delivery_fee_default_pkr', 350))
    const delivery =
      body.customer.city.toLowerCase() === 'karachi' ? karachiFee : body.customer.city.includes('Other') ? otherFee : defaultFee

    let discount = 0
    if (body.promoCode) {
      const { rows } = await client.query(
        `SELECT * FROM promo_codes WHERE code = $1 AND active = true
         AND (expires_at IS NULL OR expires_at > now())
         AND (max_redemptions IS NULL OR redemption_count < max_redemptions)`,
        [body.promoCode.toUpperCase()],
      )
      const promo = rows[0]
      if (promo) {
        discount = promo.discount_type === 'percent' ? Math.round((subtotal * promo.discount_value) / 100) : promo.discount_value
        await client.query(`UPDATE promo_codes SET redemption_count = redemption_count + 1 WHERE code = $1`, [promo.code])
      }
    }

    const total = Math.max(0, subtotal + testingFees + delivery - discount)
    const ref = generateOrderRef()

    await client.query('BEGIN')

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (ref, customer_name, email, phone, street, area, city, province, postal_code, delivery_notes,
         subtotal_pkr, testing_fees_pkr, delivery_pkr, discount_pkr, total_pkr, payment_method, promo_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        ref,
        `${body.customer.firstName} ${body.customer.lastName}`,
        body.customer.email,
        body.customer.phone,
        body.customer.street,
        body.customer.area ?? null,
        body.customer.city,
        body.customer.province,
        body.customer.postalCode ?? null,
        body.customer.notes ?? null,
        subtotal,
        testingFees,
        delivery,
        discount,
        total,
        body.paymentMethod,
        body.promoCode?.toUpperCase() ?? null,
      ],
    )
    const order = orderRows[0]

    for (const { product, item, testing } of lineRows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, collection_slug, category, size, qty, unit_price_pkr, gemstone_testing)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [order.id, product.id, product.name, product.collection_slug, product.category, item.size ?? null, item.qty, product.price_pkr, testing],
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ ref: order.ref, total, subtotal, testingFees, delivery, discount })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})

// Public: submit payment proof for an order (bank transfer)
ordersRouter.post('/:ref/payment-proof', upload.single('proof'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const { rows } = await pool.query(
      `UPDATE orders SET payment_proof_url = $1, payment_status = 'pending-review', updated_at = now()
       WHERE ref = $2 RETURNING ref, payment_status`,
      [`/uploads/${req.file.filename}`, req.params.ref],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// Public: track an order — requires the phone number on file, so a bare
// reference number alone can't be used to pull up someone else's order.
ordersRouter.get('/track/:ref', async (req, res, next) => {
  try {
    const phone = String(req.query.phone ?? '')
    const { rows } = await pool.query(
      `SELECT ref, order_status, payment_status, payment_method, courier_name, tracking_number, tracking_url, dispatched_at, created_at
       FROM orders WHERE ref = $1 AND phone = $2`,
      [req.params.ref, phone],
    )
    if (!rows[0]) return res.status(404).json({ error: 'No matching order found for that reference and phone number' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// ── Admin routes ──────────────────────────────────────────────
ordersRouter.use(requireAuth)

ordersRouter.get('/', async (req, res, next) => {
  try {
    const { status, paymentStatus, search } = req.query
    const clauses: string[] = ['1=1']
    const params: unknown[] = []

    if (status) { params.push(status); clauses.push(`order_status = $${params.length}`) }
    if (paymentStatus) { params.push(paymentStatus); clauses.push(`payment_status = $${params.length}`) }
    if (search) { params.push(`%${search}%`); clauses.push(`(ref ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR phone ILIKE $${params.length})`) }

    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
      params,
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

ordersRouter.get('/:ref', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM orders WHERE ref = $1`, [req.params.ref])
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' })
    const items = await pool.query(`SELECT * FROM order_items WHERE order_id = $1`, [rows[0].id])
    res.json({ ...rows[0], items: items.rows })
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({
  orderStatus: z.enum(['pending-confirmation', 'awaiting-payment', 'preparing', 'quality-check', 'ready-for-dispatch', 'dispatched', 'delivered']),
  courierName: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
})

// Admin: move an order along the production/dispatch workflow.
// Production stages are blocked until payment is verified for bank transfers.
ordersRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const body = statusSchema.parse(req.body)
    const { rows: existing } = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id])
    const order = existing[0]
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const productionStages = ['preparing', 'quality-check', 'ready-for-dispatch', 'dispatched', 'delivered']
    if (productionStages.includes(body.orderStatus) && order.payment_method === 'bank-transfer' && order.payment_status !== 'verified') {
      return res.status(409).json({ error: 'Cannot start production before the bank transfer payment is verified' })
    }

    const dispatchedAt = body.orderStatus === 'dispatched' ? new Date() : order.dispatched_at

    const { rows } = await pool.query(
      `UPDATE orders SET order_status = $1, courier_name = COALESCE($2, courier_name),
         tracking_number = COALESCE($3, tracking_number), tracking_url = COALESCE($4, tracking_url),
         dispatched_at = $5, updated_at = now()
       WHERE id = $6 RETURNING *`,
      [body.orderStatus, body.courierName ?? null, body.trackingNumber ?? null, body.trackingUrl ?? null, dispatchedAt, req.params.id],
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// Admin: mark payment verified. This is the ONLY path that generates
// article registry codes — one per physical piece, never before verification.
ordersRouter.post('/:id/verify-payment', async (req: AuthedRequest, res, next) => {
  const client = await pool.connect()
  try {
    const { rows: existing } = await client.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id])
    const order = existing[0]
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (order.payment_status === 'verified') return res.status(409).json({ error: 'Payment already verified' })

    await client.query('BEGIN')

    await client.query(
      `UPDATE orders SET payment_status = 'verified', verified_at = now(), verified_by = $1, updated_at = now() WHERE id = $2`,
      [req.admin!.id, order.id],
    )

    const { rows: items } = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [order.id])
    const codes: string[] = []
    for (const item of items) {
      for (let i = 0; i < item.qty; i++) {
        let code = generateArticleCode()
        // extremely unlikely collision, but guard anyway
        // eslint-disable-next-line no-await-in-loop
        while ((await client.query(`SELECT 1 FROM article_codes WHERE code = $1`, [code])).rows.length) {
          code = generateArticleCode()
        }
        await client.query(
          `INSERT INTO article_codes (code, order_id, order_item_id, product_name, collection_slug, sku, variant, customer_name, purchase_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            code,
            order.id,
            item.id,
            item.product_name,
            item.collection_slug,
            (await client.query(`SELECT sku FROM products WHERE id = $1`, [item.product_id])).rows[0]?.sku ?? 'N/A',
            item.size ? `Size ${item.size}` : null,
            order.customer_name,
            order.created_at,
          ],
        )
        codes.push(code)
      }
    }

    await client.query('COMMIT')
    res.json({ ok: true, articleCodes: codes })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})
