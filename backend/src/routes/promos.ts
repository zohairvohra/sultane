import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { requireAuth } from '../middleware/auth'

export const promosRouter = Router()

// Public: validate a code at checkout without redeeming it yet
// (redemption is recorded when the order is actually placed, in orders.ts)
promosRouter.get('/validate/:code', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT code, description, discount_type, discount_value FROM promo_codes
       WHERE code = $1 AND active = true
       AND (starts_at IS NULL OR starts_at <= now())
       AND (expires_at IS NULL OR expires_at > now())
       AND (max_redemptions IS NULL OR redemption_count < max_redemptions)`,
      [req.params.code.trim().toUpperCase()],
    )
    if (!rows[0]) return res.status(404).json({ valid: false })
    res.json({ valid: true, ...rows[0] })
  } catch (err) {
    next(err)
  }
})

// ── Admin ──────────────────────────────────────────────────────
promosRouter.use(requireAuth)

promosRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM promo_codes ORDER BY code`)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

const promoSchema = z.object({
  code: z.string().min(3),
  description: z.string().optional(),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number().int().positive(),
  maxRedemptions: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
})

promosRouter.post('/', async (req, res, next) => {
  try {
    const p = promoSchema.parse(req.body)
    const { rows } = await pool.query(
      `INSERT INTO promo_codes (code, description, discount_type, discount_value, max_redemptions, starts_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [p.code.toUpperCase(), p.description ?? null, p.discountType, p.discountValue, p.maxRedemptions ?? null, p.startsAt ?? null, p.expiresAt ?? null],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

promosRouter.patch('/:code', async (req, res, next) => {
  try {
    const { active } = z.object({ active: z.boolean() }).parse(req.body)
    const { rows } = await pool.query(`UPDATE promo_codes SET active = $1 WHERE code = $2 RETURNING *`, [active, req.params.code])
    if (!rows[0]) return res.status(404).json({ error: 'Promo code not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})
