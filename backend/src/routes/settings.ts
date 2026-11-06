import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { requireAuth, requireOwner } from '../middleware/auth'
import { mediaUpload, publicUrl } from '../middleware/upload'

export const settingsRouter = Router()

// Every editable setting and how it is validated. Unknown keys are rejected.
const SCHEMAS = {
  whatsapp_number: z.string().regex(/^92\d{10}$/, 'Use international format without +, e.g. 923001234567'),
  delivery_fee_karachi_pkr: z.number().int().nonnegative(),
  delivery_fee_other_pkr: z.number().int().nonnegative(),
  gemstone_testing_fee_pkr: z.number().int().nonnegative(),
  bank_details: z.object({
    bankName: z.string().max(100),
    accountTitle: z.string().max(100),
    accountNumber: z.string().max(60),
    iban: z.string().max(60),
  }),
  hero_video_url: z.string().max(500),
  hero_poster_url: z.string().max(500),
  loyalty_percent: z.number().int().min(1).max(50),
  loyalty_valid_days: z.number().int().min(1).max(730),
  announcement: z.string().max(300),
  about_story: z.string().max(10000),
  faqs: z.array(z.object({ q: z.string().min(1).max(300), a: z.string().min(1).max(3000) })).max(60),
  policy_delivery: z.string().max(20000),
  policy_returns: z.string().max(20000),
  policy_privacy: z.string().max(20000),
  policy_terms: z.string().max(20000),
} as const

type Key = keyof typeof SCHEMAS
// All current settings are safe to show on the storefront.
const PUBLIC_KEYS = Object.keys(SCHEMAS) as Key[]

settingsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [PUBLIC_KEYS])
  res.setHeader('Cache-Control', 'public, max-age=60')
  res.json(Object.fromEntries(rows.map((r: { key: string; value: unknown }) => [r.key, r.value])))
})

settingsRouter.put('/:key', requireAuth, requireOwner, async (req, res) => {
  const key = req.params.key as Key
  const schema = SCHEMAS[key]
  if (!schema) return res.status(400).json({ error: `Unknown setting “${key}”` })
  const value = schema.parse(req.body.value)
  const { rows } = await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2 RETURNING key, value`,
    [key, JSON.stringify(value)],
  )
  res.json(rows[0])
})

// Upload the owner's hero video or fallback poster image.
settingsRouter.post('/media/:key', requireAuth, requireOwner, mediaUpload.single('file'), async (req, res) => {
  const key = req.params.key
  if (key !== 'hero_video_url' && key !== 'hero_poster_url') return res.status(400).json({ error: 'Unknown media slot' })
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const isVideo = req.file.mimetype.startsWith('video/')
  if ((key === 'hero_video_url') !== isVideo) return res.status(400).json({ error: key === 'hero_video_url' ? 'Upload an MP4 or WebM video' : 'Upload an image' })
  const url = publicUrl(req.file.filename)
  await pool.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [key, JSON.stringify(url)])
  res.json({ key, value: url })
})
