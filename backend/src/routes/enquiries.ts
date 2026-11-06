import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { requireAuth } from '../middleware/auth'
import { upload } from '../middleware/upload'
import { generateEnquiryRef } from '../utils/refs'

export const enquiriesRouter = Router()

const enquirySchema = z.object({
  type: z.enum(['customize', 'new-design']),
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  productId: z.string().uuid().optional(),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  jewelleryType: z.string().optional(),
  purityPreference: z.string().optional(),
  budgetRange: z.string().optional(),
  sizeNotes: z.string().optional(),
  instructions: z.string().optional(),
})

// Public: submit a customisation or new-design enquiry, with optional
// private reference images (staff-only — never exposed on any public route).
enquiriesRouter.post('/', upload.array('files', 5), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const body = enquirySchema.parse(req.body)
    const ref = generateEnquiryRef()

    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO enquiries (ref, type, name, phone, email, product_id, product_name, product_sku,
         jewellery_type, purity_preference, budget_range, size_notes, instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        ref, body.type, body.name, body.phone, body.email || null, body.productId ?? null,
        body.productName ?? null, body.productSku ?? null, body.jewelleryType ?? null,
        body.purityPreference ?? null, body.budgetRange ?? null, body.sizeNotes ?? null, body.instructions ?? null,
      ],
    )
    const enquiry = rows[0]

    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    for (const file of files) {
      await client.query(`INSERT INTO enquiry_files (enquiry_id, url, filename) VALUES ($1,$2,$3)`, [
        enquiry.id,
        `/uploads/${file.filename}`,
        file.originalname,
      ])
    }

    await client.query('COMMIT')
    res.status(201).json({ ref: enquiry.ref })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})

// ── Admin routes ──────────────────────────────────────────────
enquiriesRouter.use(requireAuth)

enquiriesRouter.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query
    const clauses: string[] = ['1=1']
    const params: unknown[] = []
    if (status) { params.push(status); clauses.push(`status = $${params.length}`) }
    if (search) { params.push(`%${search}%`); clauses.push(`(ref ILIKE $${params.length} OR name ILIKE $${params.length} OR phone ILIKE $${params.length})`) }

    const { rows } = await pool.query(
      `SELECT * FROM enquiries WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
      params,
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

enquiriesRouter.get('/:ref', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM enquiries WHERE ref = $1`, [req.params.ref])
    if (!rows[0]) return res.status(404).json({ error: 'Enquiry not found' })
    const files = await pool.query(`SELECT id, url, filename FROM enquiry_files WHERE enquiry_id = $1`, [rows[0].id])
    res.json({ ...rows[0], files: files.rows })
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'accepted', 'declined']),
  quotedPricePkr: z.number().int().nonnegative().optional(),
})

enquiriesRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const body = statusSchema.parse(req.body)
    const { rows } = await pool.query(
      `UPDATE enquiries SET status = $1, quoted_price_pkr = COALESCE($2, quoted_price_pkr), updated_at = now()
       WHERE id = $3 RETURNING *`,
      [body.status, body.quotedPricePkr ?? null, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Enquiry not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})
