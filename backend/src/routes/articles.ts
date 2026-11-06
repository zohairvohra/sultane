import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { requireAuth, requireOwner } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import { normaliseArticleCode } from '../utils/refs'

export const articlesRouter = Router()

// Brute-force protection: per-IP limits on a short and a long window, plus
// a 31^12 code space, make guessing a registered number impractical.
const burstLimiter = rateLimit({ windowMs: 60_000, max: 10, message: 'Too many verification attempts. Please wait a minute.' })
const hourlyLimiter = rateLimit({ windowMs: 60 * 60_000, max: 60, message: 'Too many verification attempts. Please try again later.' })

// ── Public verification ───────────────────────────────────────
// For a valid number returns ONLY: customer name, piece name, purchase date.
// Invalid, malformed or voided numbers all return the same generic 404 —
// nothing about any customer or order is revealed.
articlesRouter.get('/verify/:code', burstLimiter, hourlyLimiter, async (req, res) => {
  const code = normaliseArticleCode(String(req.params.code))
  const notFound = () => res.status(404).json({ error: 'This article number is not registered with SULTANÉ' })
  if (!code) return notFound()

  const { rows } = await pool.query(
    `UPDATE article_codes SET verification_count = verification_count + 1, last_verified_at = now()
     WHERE code = $1 AND status = 'active'
     RETURNING code, customer_name, product_name, purchase_date`,
    [code],
  )
  const r = rows[0]
  if (!r) return notFound()
  res.setHeader('Cache-Control', 'no-store')
  res.json({ code: r.code, customerName: r.customer_name, productName: r.product_name, purchaseDate: r.purchase_date })
})

// ── Admin registry ────────────────────────────────────────────
articlesRouter.get('/', requireAuth, async (req, res) => {
  const search = String(req.query.search ?? '').trim()
  const params: unknown[] = []
  let where = ''
  if (search) {
    params.push(`%${search}%`)
    where = `WHERE a.code ILIKE $1 OR a.customer_name ILIKE $1 OR a.product_name ILIKE $1 OR o.ref ILIKE $1`
  }
  const { rows } = await pool.query(
    `SELECT a.*, o.ref AS order_ref, o.order_status, oi.sku, oi.size
     FROM article_codes a JOIN orders o ON o.id = a.order_id JOIN order_items oi ON oi.id = a.order_item_id
     ${where} ORDER BY a.created_at DESC, a.piece_index LIMIT 1000`,
    params,
  )
  res.json(rows)
})

// Authorised corrections (e.g. a misspelt name on the public record).
articlesRouter.patch('/:id', requireAuth, requireOwner, async (req, res) => {
  const b = z
    .object({
      customerName: z.string().trim().min(1).max(120).optional(),
      productName: z.string().trim().min(1).max(160).optional(),
      purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      status: z.enum(['active', 'void']).optional(),
      notes: z.string().max(2000).optional(),
    })
    .parse(req.body)
  const { rows } = await pool.query(
    `UPDATE article_codes SET customer_name = coalesce($2, customer_name), product_name = coalesce($3, product_name),
       purchase_date = coalesce($4::date, purchase_date), status = coalesce($5, status), notes = coalesce($6, notes), updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, b.customerName ?? null, b.productName ?? null, b.purchaseDate ?? null, b.status ?? null, b.notes ?? null],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Record not found' })
  res.json(rows[0])
})
