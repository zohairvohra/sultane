import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { parsePatch } from '../utils/patch'
import { requireAuth, requireOwner } from '../middleware/auth'
import { imageUpload, publicUrl, safeUnlink, PUBLIC_DIR } from '../middleware/upload'
import { slugify } from '../utils/refs'

export const collectionsRouter = Router()

collectionsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, (SELECT count(*)::int FROM product_collections pc JOIN products p ON p.id = pc.product_id
                  WHERE pc.collection_slug = c.slug AND p.status IN ('active','paused')) AS product_count
     FROM collections c ORDER BY c.position, c.name`,
  )
  res.json(rows)
})

const schema = z.object({
  slug: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().max(200).default(''),
  description: z.string().max(3000).default(''),
  position: z.number().int().default(0),
})

collectionsRouter.post('/', requireAuth, requireOwner, async (req, res) => {
  const c = schema.parse(req.body)
  const { rows } = await pool.query(
    `INSERT INTO collections (slug, name, tagline, description, position) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [slugify(c.slug || c.name), c.name, c.tagline, c.description, c.position],
  )
  res.status(201).json(rows[0])
})

collectionsRouter.patch('/:slug', requireAuth, requireOwner, async (req, res) => {
  const c = parsePatch(schema, req.body)
  const { rows } = await pool.query(
    `UPDATE collections SET name = coalesce($2, name), tagline = coalesce($3, tagline),
       description = coalesce($4, description), position = coalesce($5, position)
     WHERE slug = $1 RETURNING *`,
    [req.params.slug, c.name ?? null, c.tagline ?? null, c.description ?? null, c.position ?? null],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Collection not found' })
  res.json(rows[0])
})

collectionsRouter.post('/:slug/image', requireAuth, requireOwner, imageUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' })
  const old = await pool.query(`SELECT image_url FROM collections WHERE slug = $1`, [req.params.slug])
  if (!old.rows[0]) {
    safeUnlink(PUBLIC_DIR, req.file.filename)
    return res.status(404).json({ error: 'Collection not found' })
  }
  safeUnlink(PUBLIC_DIR, old.rows[0].image_url)
  const { rows } = await pool.query(`UPDATE collections SET image_url = $2 WHERE slug = $1 RETURNING *`, [
    req.params.slug,
    publicUrl(req.file.filename),
  ])
  res.json(rows[0])
})

collectionsRouter.delete('/:slug', requireAuth, requireOwner, async (req, res) => {
  const { rows } = await pool.query(`DELETE FROM collections WHERE slug = $1 RETURNING image_url`, [req.params.slug])
  if (!rows[0]) return res.status(404).json({ error: 'Collection not found' })
  safeUnlink(PUBLIC_DIR, rows[0].image_url)
  res.status(204).end()
})
