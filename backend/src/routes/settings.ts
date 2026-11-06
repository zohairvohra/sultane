import { Router } from 'express'
import { pool } from '../db/pool'
import { requireAuth } from '../middleware/auth'

export const settingsRouter = Router()

// Public settings the storefront needs (WhatsApp number, delivery fees, fees)
const PUBLIC_KEYS = [
  'whatsapp_number',
  'delivery_fee_default_pkr',
  'delivery_fee_karachi_pkr',
  'delivery_fee_other_pkr',
  'gemstone_testing_fee_pkr',
]

settingsRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [PUBLIC_KEYS])
    res.json(Object.fromEntries(rows.map((r: { key: string; value: unknown }) => [r.key, r.value])))
  } catch (err) {
    next(err)
  }
})

settingsRouter.get('/all', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT key, value FROM settings ORDER BY key`)
    res.json(Object.fromEntries(rows.map((r: { key: string; value: unknown }) => [r.key, r.value])))
  } catch (err) {
    next(err)
  }
})

settingsRouter.put('/:key', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2 RETURNING *`,
      [req.params.key, JSON.stringify(req.body.value)],
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})
