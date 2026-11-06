import { Router } from 'express'
import path from 'node:path'
import { z } from 'zod'
import { pool } from '../db/pool'
import { deliveryFeeFor } from '../lib/pricing'
import { requireAuth } from '../middleware/auth'
import { HttpError } from '../middleware/errorHandler'
import { rateLimit } from '../middleware/rateLimit'
import { enquiryUpload, PRIVATE_DIR, safeUnlink } from '../middleware/upload'
import { generateEnquiryRef, generateOrderRef, normalisePhone } from '../utils/refs'

export const enquiriesRouter = Router()

const submitLimiter = rateLimit({ windowMs: 10 * 60_000, max: 8, message: 'Too many requests. Please message us on WhatsApp instead.' })

const enquirySchema = z.object({
  type: z.enum(['customize', 'new-design']),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(20),
  productId: z.string().uuid().optional(),
  jewelleryType: z.string().trim().max(60).optional(),
  description: z.string().trim().min(10, 'Please describe what you would like').max(4000),
  preferences: z.string().trim().max(2000).optional(),
})

// Public: submit a customisation request. This never creates an order or
// takes payment — the owner quotes on WhatsApp first.
enquiriesRouter.post('/', submitLimiter, enquiryUpload.array('files', 5), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const client = await pool.connect()
  try {
    const body = enquirySchema.parse(req.body)
    const phone = normalisePhone(body.phone)
    if (!/^92\d{10}$/.test(phone)) throw new HttpError(400, 'Please enter a valid Pakistani mobile number')
    if (body.type === 'new-design' && files.length === 0) throw new HttpError(400, 'Please upload at least one inspiration image')

    let product: { id: string; name: string; sku: string } | null = null
    if (body.type === 'customize') {
      if (!body.productId) throw new HttpError(400, 'Missing product')
      const { rows } = await client.query(`SELECT id, name, sku FROM products WHERE id = $1 AND status <> 'draft'`, [body.productId])
      product = rows[0] ?? null
      if (!product) throw new HttpError(400, 'That design is no longer available')
    }

    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO enquiries (ref, type, name, phone, product_id, product_name, product_sku, jewellery_type, description, preferences)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        generateEnquiryRef(), body.type, body.name, phone, product?.id ?? null, product?.name ?? null, product?.sku ?? null,
        body.jewelleryType || null, body.description, body.preferences || null,
      ],
    )
    for (const f of files) {
      await client.query(`INSERT INTO enquiry_files (enquiry_id, path, filename) VALUES ($1,$2,$3)`, [rows[0].id, f.filename, f.originalname.slice(0, 200)])
    }
    await client.query('COMMIT')
    res.status(201).json({ ref: rows[0].ref, productName: product?.name ?? null })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined)
    files.forEach((f) => safeUnlink(PRIVATE_DIR, f.filename))
    throw err
  } finally {
    client.release()
  }
})

// ══ Admin ════════════════════════════════════════════════════
enquiriesRouter.use(requireAuth)

enquiriesRouter.get('/', async (req, res) => {
  const { status, type, search } = req.query as Record<string, string | undefined>
  const clauses = ['1=1']
  const params: unknown[] = []
  if (status) { params.push(status); clauses.push(`status = $${params.length}`) }
  if (type) { params.push(type); clauses.push(`type = $${params.length}`) }
  if (search) {
    params.push(`%${search}%`)
    clauses.push(`(ref ILIKE $${params.length} OR name ILIKE $${params.length} OR phone ILIKE $${params.length} OR product_name ILIKE $${params.length})`)
  }
  const { rows } = await pool.query(
    `SELECT e.*, (SELECT count(*)::int FROM enquiry_files f WHERE f.enquiry_id = e.id) AS file_count
     FROM enquiries e WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 500`,
    params,
  )
  res.json(rows)
})

enquiriesRouter.get('/:ref', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT e.*, o.ref AS order_ref FROM enquiries e LEFT JOIN orders o ON o.id = e.order_id WHERE e.ref = $1`,
    [req.params.ref],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Enquiry not found' })
  const files = await pool.query(`SELECT id, filename FROM enquiry_files WHERE enquiry_id = $1`, [rows[0].id])
  res.json({ ...rows[0], files: files.rows })
})

// Reference images are private — streamed only to signed-in admins.
enquiriesRouter.get('/files/:fileId', async (req, res) => {
  const { rows } = await pool.query(`SELECT path FROM enquiry_files WHERE id = $1`, [req.params.fileId])
  if (!rows[0]) return res.status(404).json({ error: 'File not found' })
  res.setHeader('Cache-Control', 'private, no-store')
  res.sendFile(path.join(PRIVATE_DIR, path.basename(rows[0].path)))
})

enquiriesRouter.patch('/:id', async (req, res) => {
  const b = z
    .object({
      status: z.enum(['new', 'contacted', 'quoted', 'declined']).optional(),
      quotedPricePkr: z.number().int().nonnegative().nullable().optional(),
      adminNotes: z.string().max(5000).optional(),
    })
    .parse(req.body)
  const { rows } = await pool.query(
    `UPDATE enquiries SET status = coalesce($2, status),
       quoted_price_pkr = CASE WHEN $3::boolean THEN $4 ELSE quoted_price_pkr END,
       admin_notes = coalesce($5, admin_notes), updated_at = now()
     WHERE id = $1 AND status <> 'converted' RETURNING *`,
    [req.params.id, b.status ?? null, b.quotedPricePkr !== undefined, b.quotedPricePkr ?? null, b.adminNotes ?? null],
  )
  if (!rows[0]) throw new HttpError(409, 'Enquiry not found or already converted to an order')
  res.json(rows[0])
})

// Turn an approved quotation into an order. It starts as "Pending Price"
// so the owner can finalise the amount before sending payment details.
enquiriesRouter.post('/:id/convert', async (req, res) => {
  const b = z
    .object({
      pricePkr: z.number().int().positive(),
      title: z.string().trim().min(2).max(160),
      details: z.string().trim().max(4000).optional(),
      street: z.string().trim().min(3).max(300),
      area: z.string().trim().max(200).optional(),
      city: z.string().trim().min(2).max(80),
      province: z.string().trim().max(80).optional(),
    })
    .parse(req.body)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`SELECT * FROM enquiries WHERE id = $1 FOR UPDATE`, [req.params.id])
    const enq = rows[0]
    if (!enq) throw new HttpError(404, 'Enquiry not found')
    if (enq.status === 'converted') throw new HttpError(409, 'Already converted to an order')

    const delivery = (await deliveryFeeFor(b.city, client)) ?? 0
    let ref = generateOrderRef()
    while ((await client.query(`SELECT 1 FROM orders WHERE ref = $1`, [ref])).rowCount) ref = generateOrderRef()

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (ref, customer_name, phone, street, area, city, province, subtotal_pkr, delivery_pkr, total_pkr, order_status, enquiry_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending-price',$11) RETURNING *`,
      [ref, enq.name, enq.phone, b.street, b.area || null, b.city, b.province || null, b.pricePkr, delivery, b.pricePkr + delivery, enq.id],
    )
    const order = orderRows[0]
    const sku = enq.product_sku ? `${enq.product_sku}-CUSTOM` : 'CUSTOM'
    await client.query(
      `INSERT INTO order_items (order_id, product_id, sku, product_name, qty, unit_price_pkr, is_custom, custom_details)
       VALUES ($1,$2,$3,$4,1,$5,true,$6)`,
      [order.id, enq.product_id, sku, b.title, b.pricePkr, b.details || enq.description],
    )
    await client.query(
      `UPDATE enquiries SET status = 'converted', order_id = $2, quoted_price_pkr = $3, updated_at = now() WHERE id = $1`,
      [enq.id, order.id, b.pricePkr],
    )
    await client.query('COMMIT')
    res.status(201).json({ ref: order.ref })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})
