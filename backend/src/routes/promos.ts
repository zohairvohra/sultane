import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { parsePatch } from '../utils/patch'
import { requireAuth, requireOwner } from '../middleware/auth'

// Customers never call this router: codes are evaluated server-side via
// POST /api/orders/quote and re-checked when the order is placed.
export const promosRouter = Router()
promosRouter.use(requireAuth)

promosRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, coalesce((SELECT sum(amount_pkr)::int FROM promo_redemptions r WHERE r.code = p.code), 0) AS total_discount_pkr
     FROM promo_codes p ORDER BY p.kind, p.created_at DESC`,
  )
  res.json(rows)
})

promosRouter.get('/loyalty', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT l.*, o.ref AS issued_for_ref, r.ref AS redeemed_ref, p.expires_at
     FROM loyalty_rewards l
     LEFT JOIN orders o ON o.id = l.issued_for_order
     LEFT JOIN orders r ON r.id = l.redeemed_order
     LEFT JOIN promo_codes p ON p.code = l.code
     ORDER BY l.issued_at DESC`,
  )
  res.json(rows)
})

// Delivered customers who have not yet received their reward.
promosRouter.get('/loyalty/eligible', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (o.phone) o.id, o.ref, o.customer_name, o.phone, o.delivered_at
     FROM orders o
     WHERE o.order_status = 'delivered' AND NOT EXISTS (SELECT 1 FROM loyalty_rewards l WHERE l.customer_phone = o.phone)
     ORDER BY o.phone, o.delivered_at ASC`,
  )
  res.json(rows)
})

const dateOrNull = z.string().datetime({ offset: true }).nullable().optional().or(z.literal(''))

const promoSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
  description: z.string().max(200).optional(),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number().int().positive(),
  minOrderPkr: z.number().int().nonnegative().default(0),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  perPhoneLimit: z.number().int().positive().nullable().optional(),
  startsAt: dateOrNull,
  expiresAt: dateOrNull,
  active: z.boolean().default(true),
  collectionSlugs: z.array(z.string()).default([]),
  productIds: z.array(z.string().uuid()).default([]),
})

function validate(p: Partial<z.infer<typeof promoSchema>>) {
  if (p.discountType === 'percent' && p.discountValue && p.discountValue > 100) throw new z.ZodError([
    { code: 'custom', path: ['discountValue'], message: 'A percentage cannot exceed 100', input: p.discountValue },
  ])
}

promosRouter.post('/', requireOwner, async (req, res) => {
  const p = promoSchema.parse(req.body)
  validate(p)
  const { rows } = await pool.query(
    `INSERT INTO promo_codes (code, description, kind, discount_type, discount_value, min_order_pkr, max_redemptions, per_phone_limit,
       starts_at, expires_at, active, collection_slugs, product_ids)
     VALUES ($1,$2,'campaign',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      p.code.toUpperCase(), p.description || null, p.discountType, p.discountValue, p.minOrderPkr, p.maxRedemptions ?? null,
      p.perPhoneLimit ?? null, p.startsAt || null, p.expiresAt || null, p.active,
      p.collectionSlugs.length ? p.collectionSlugs : null, p.productIds.length ? p.productIds : null,
    ],
  )
  res.status(201).json(rows[0])
})

promosRouter.patch('/:code', requireOwner, async (req, res) => {
  const p = parsePatch(promoSchema.omit({ code: true }), req.body)
  validate(p)
  const cols: Record<string, unknown> = {
    description: p.description,
    discount_type: p.discountType,
    discount_value: p.discountValue,
    min_order_pkr: p.minOrderPkr,
    max_redemptions: p.maxRedemptions,
    per_phone_limit: p.perPhoneLimit,
    starts_at: p.startsAt === '' ? null : p.startsAt,
    expires_at: p.expiresAt === '' ? null : p.expiresAt,
    active: p.active,
    collection_slugs: p.collectionSlugs === undefined ? undefined : p.collectionSlugs.length ? p.collectionSlugs : null,
    product_ids: p.productIds === undefined ? undefined : p.productIds.length ? p.productIds : null,
  }
  const entries = Object.entries(cols).filter(([, v]) => v !== undefined)
  if (!entries.length) return res.status(400).json({ error: 'Nothing to update' })
  const { rows } = await pool.query(
    `UPDATE promo_codes SET ${entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')} WHERE code = $1 RETURNING *`,
    [req.params.code, ...entries.map(([, v]) => v)],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Code not found' })
  res.json(rows[0])
})

// Codes that have been used are disabled rather than deleted, to keep the redemption history.
promosRouter.delete('/:code', requireOwner, async (req, res) => {
  const used = await pool.query(`SELECT 1 FROM promo_redemptions WHERE code = $1 LIMIT 1`, [req.params.code])
  if (used.rowCount) {
    await pool.query(`UPDATE promo_codes SET active = false WHERE code = $1`, [req.params.code])
    return res.json({ disabled: true })
  }
  await pool.query(`DELETE FROM loyalty_rewards WHERE code = $1`, [req.params.code])
  const { rowCount } = await pool.query(`DELETE FROM promo_codes WHERE code = $1`, [req.params.code])
  if (!rowCount) return res.status(404).json({ error: 'Code not found' })
  res.status(204).end()
})
