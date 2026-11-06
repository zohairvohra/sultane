import { Router } from 'express'
import { pool } from '../db/pool'
import { requireAuth } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'

export const articlesRouter = Router()

const lookupLimiter = rateLimit({ windowMs: 60_000, max: 20 })

// Public: look up an article code. Returns ONLY the fields the business
// requirements allow — customer name, piece name, purchase date, and
// non-identifying registry metadata. Never phone, address, or email.
// An invalid code returns a generic 404 (no hints about why it failed).
articlesRouter.get('/:code', lookupLimiter, async (req, res, next) => {
  try {
    const code = String(req.params.code).trim().toUpperCase()
    const { rows } = await pool.query(`SELECT * FROM article_codes WHERE code = $1`, [code])
    const record = rows[0]
    if (!record) return res.status(404).json({ error: 'No matching record' })

    await pool.query(`UPDATE article_codes SET verification_count = verification_count + 1 WHERE id = $1`, [record.id])

    res.json({
      code: record.code,
      productName: record.product_name,
      collectionSlug: record.collection_slug,
      sku: record.sku,
      variant: record.variant,
      materialNote: record.material_note,
      recordedWeight: record.recorded_weight,
      customerName: record.customer_name,
      purchaseDate: record.purchase_date,
      firstVerified: record.created_at,
      verificationCount: record.verification_count + 1,
    })
  } catch (err) {
    next(err)
  }
})

// ── Admin ──────────────────────────────────────────────────────
articlesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM article_codes ORDER BY created_at DESC LIMIT 500`)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})
