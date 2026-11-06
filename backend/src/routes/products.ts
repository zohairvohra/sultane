import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { parsePatch } from '../utils/patch'
import { requireAuth, requireOwner } from '../middleware/auth'
import { imageUpload, publicUrl, safeUnlink, PUBLIC_DIR } from '../middleware/upload'
import { slugify } from '../utils/refs'

export const productsRouter = Router()

export const CATEGORIES = ['Necklaces', 'Earrings', 'Bracelets', 'Rings', 'Chains', 'Pendants'] as const

// Each product row comes back with its collection memberships and ordered images.
const PRODUCT_SELECT = `
  SELECT p.*,
    coalesce((SELECT array_agg(pc.collection_slug ORDER BY pc.collection_slug) FROM product_collections pc WHERE pc.product_id = p.id), '{}') AS collections,
    coalesce((SELECT json_agg(json_build_object('id', pi.id, 'url', pi.url, 'position', pi.position) ORDER BY pi.position, pi.id)
              FROM product_images pi WHERE pi.product_id = p.id), '[]'::json) AS images
  FROM products p`

// ── Public catalogue ─────────────────────────────────────────
productsRouter.get('/', async (req, res) => {
  const q = req.query as Record<string, string | undefined>
  const clauses: string[] = [`p.status IN ('active','paused')`]
  const params: unknown[] = []
  // `?` placeholders in `sql` all refer to the same single value.
  const add = (sql: string, value: unknown) => {
    params.push(value)
    clauses.push(sql.replaceAll('?', `$${params.length}`))
  }

  if (q.category) add('p.category = ANY(?::text[])', q.category.split(','))
  if (q.collection) add('EXISTS (SELECT 1 FROM product_collections pc WHERE pc.product_id = p.id AND pc.collection_slug = ANY(?::text[]))', q.collection.split(','))
  if (q.gemstone === 'any') clauses.push('p.gemstone_type IS NOT NULL')
  else if (q.gemstone === 'none') clauses.push('p.gemstone_type IS NULL')
  else if (q.gemstone) add('p.gemstone_type = ANY(?::text[])', q.gemstone.split(','))
  if (q.mens === '1') clauses.push('p.is_mens = true')
  if (q.mens === '0') clauses.push('p.is_mens = false')
  if (q.premium === '1') clauses.push('p.is_premium = true')
  if (q.bestseller === '1') clauses.push('p.is_bestseller = true')
  if (q.q) add('(p.name ILIKE ? OR p.description ILIKE ? OR p.sku ILIKE ? OR p.gemstone_type ILIKE ? OR p.category ILIKE ?)', `%${q.q}%`)

  const sort =
    q.sort === 'price-asc' ? 'p.price_pkr ASC' : q.sort === 'price-desc' ? 'p.price_pkr DESC' : q.sort === 'newest' ? 'p.created_at DESC' : 'p.position, p.created_at DESC'

  const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY ${sort} LIMIT 500`, params)
  res.json(rows)
})

// Distinct gemstone types currently on sale — drives the gemstone filter.
productsRouter.get('/gemstones', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT gemstone_type FROM products WHERE gemstone_type IS NOT NULL AND status IN ('active','paused') ORDER BY 1`,
  )
  res.json(rows.map((r: { gemstone_type: string }) => r.gemstone_type))
})

// ── Admin catalogue (declared before /:slug so the paths don't collide) ──
productsRouter.get('/admin/all', requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`${PRODUCT_SELECT} ORDER BY p.position, p.created_at DESC`)
  res.json(rows)
})

productsRouter.get('/admin/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Product not found' })
  res.json(rows[0])
})

productsRouter.get('/:slug', async (req, res) => {
  const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.slug = $1 AND p.status IN ('active','paused')`, [req.params.slug])
  if (!rows[0]) return res.status(404).json({ error: 'Product not found' })
  res.json(rows[0])
})

const nullableText = z.string().trim().max(2000).nullable().optional().transform((v) => (v ? v : null))

const productSchema = z.object({
  sku: z.string().trim().min(1).max(40),
  slug: z.string().trim().max(120).optional(),
  name: z.string().trim().min(1).max(120),
  category: z.enum(CATEGORIES),
  pricePkr: z.number().int().nonnegative(),
  description: z.string().max(5000).default(''),
  sizes: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  status: z.enum(['active', 'paused', 'draft']).default('draft'),
  productionTime: z.string().trim().min(1).max(80),
  isBestseller: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  isMens: z.boolean().default(false),
  allowCustomisation: z.boolean().default(true),
  purity925: z.boolean().default(false),
  materialNote: nullableText,
  gemstoneType: nullableText,
  gemstoneOrigin: z.enum(['natural', 'lab-created']).nullable().optional(),
  gemstoneDetails: nullableText,
  testingAvailable: z.boolean().default(false),
  certificationInfo: nullableText,
  position: z.number().int().default(0),
  collections: z.array(z.string()).default([]),
})

function toColumns(p: Partial<z.infer<typeof productSchema>>) {
  const cols: Record<string, unknown> = {
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price_pkr: p.pricePkr,
    description: p.description,
    sizes: p.sizes === undefined ? undefined : p.sizes.length ? p.sizes : null,
    status: p.status,
    production_time: p.productionTime,
    is_bestseller: p.isBestseller,
    is_premium: p.isPremium,
    is_mens: p.isMens,
    allow_customisation: p.allowCustomisation,
    purity_925: p.purity925,
    material_note: p.materialNote,
    gemstone_type: p.gemstoneType,
    gemstone_origin: p.gemstoneOrigin,
    gemstone_details: p.gemstoneDetails,
    testing_available: p.testingAvailable,
    certification_info: p.certificationInfo,
    position: p.position,
  }
  // Testing can only be offered on Premium pieces that actually list a gemstone.
  if (p.testingAvailable && (p.isPremium === false || p.gemstoneType === null)) cols.testing_available = false
  return Object.fromEntries(Object.entries(cols).filter(([, v]) => v !== undefined))
}

async function setCollections(client: { query: typeof pool.query }, productId: string, slugs: string[]) {
  await client.query(`DELETE FROM product_collections WHERE product_id = $1`, [productId])
  for (const slug of new Set(slugs)) {
    await client.query(`INSERT INTO product_collections (product_id, collection_slug) VALUES ($1, $2)`, [productId, slug])
  }
}

productsRouter.post('/', requireAuth, async (req, res) => {
  const p = productSchema.parse(req.body)
  const cols = toColumns({ ...p, slug: p.slug ? slugify(p.slug) : slugify(p.name) })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const keys = Object.keys(cols)
    const { rows } = await client.query(
      `INSERT INTO products (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
      Object.values(cols),
    )
    await setCollections(client, rows[0].id, p.collections)
    await client.query('COMMIT')
    const full = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [rows[0].id])
    res.status(201).json(full.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

productsRouter.patch('/:id', requireAuth, async (req, res) => {
  const p = parsePatch(productSchema, req.body)
  const cols = toColumns({ ...p, slug: p.slug !== undefined ? slugify(p.slug) : undefined })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const entries = Object.entries(cols)
    if (entries.length) {
      const set = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
      const { rowCount } = await client.query(`UPDATE products SET ${set}, updated_at = now() WHERE id = $1`, [
        req.params.id,
        ...entries.map(([, v]) => v),
      ])
      if (!rowCount) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Product not found' })
      }
    }
    if (p.collections) await setCollections(client, String(req.params.id), p.collections)
    await client.query('COMMIT')
    const full = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id])
    if (!full.rows[0]) return res.status(404).json({ error: 'Product not found' })
    res.json(full.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// Removing a product keeps past orders intact (order lines hold a snapshot).
productsRouter.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  const images = await pool.query(`SELECT url FROM product_images WHERE product_id = $1`, [req.params.id])
  const { rowCount } = await pool.query(`DELETE FROM products WHERE id = $1`, [req.params.id])
  if (!rowCount) return res.status(404).json({ error: 'Product not found' })
  images.rows.forEach((r: { url: string }) => safeUnlink(PUBLIC_DIR, r.url))
  res.status(204).end()
})

// ── Images ───────────────────────────────────────────────────
productsRouter.post('/:id/images', requireAuth, imageUpload.array('images', 10), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? []
  if (!files.length) return res.status(400).json({ error: 'No images uploaded' })
  const exists = await pool.query(`SELECT 1 FROM products WHERE id = $1`, [req.params.id])
  if (!exists.rows[0]) {
    files.forEach((f) => safeUnlink(PUBLIC_DIR, f.filename))
    return res.status(404).json({ error: 'Product not found' })
  }
  const { rows } = await pool.query(`SELECT coalesce(max(position), -1)::int AS max FROM product_images WHERE product_id = $1`, [req.params.id])
  let pos = rows[0].max + 1
  for (const f of files) {
    await pool.query(`INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, $3)`, [req.params.id, publicUrl(f.filename), pos++])
  }
  const full = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id])
  res.status(201).json(full.rows[0])
})

productsRouter.put('/:id/images/order', requireAuth, async (req, res) => {
  const { imageIds } = z.object({ imageIds: z.array(z.string().uuid()) }).parse(req.body)
  for (const [i, id] of imageIds.entries()) {
    await pool.query(`UPDATE product_images SET position = $1 WHERE id = $2 AND product_id = $3`, [i, id, req.params.id])
  }
  const full = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id])
  res.json(full.rows[0])
})

productsRouter.delete('/:id/images/:imageId', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING url`, [
    req.params.imageId,
    req.params.id,
  ])
  if (!rows[0]) return res.status(404).json({ error: 'Image not found' })
  safeUnlink(PUBLIC_DIR, rows[0].url)
  const full = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id])
  res.json(full.rows[0])
})
