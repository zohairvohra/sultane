import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { requireAuth } from '../middleware/auth'

export const productsRouter = Router()

// Public: list published products, with optional filters
productsRouter.get('/', async (req, res, next) => {
  try {
    const { collection, category, availability, minPrice, maxPrice } = req.query
    const clauses: string[] = ['published = true']
    const params: unknown[] = []

    if (collection) { params.push(collection); clauses.push(`collection_slug = $${params.length}`) }
    if (category) { params.push(category); clauses.push(`category = $${params.length}`) }
    if (availability) { params.push(availability); clauses.push(`availability = $${params.length}`) }
    if (minPrice) { params.push(Number(minPrice)); clauses.push(`price_pkr >= $${params.length}`) }
    if (maxPrice) { params.push(Number(maxPrice)); clauses.push(`price_pkr <= $${params.length}`) }

    const { rows } = await pool.query(
      `SELECT * FROM products WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`,
      params,
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

productsRouter.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM products WHERE slug = $1 AND published = true`, [req.params.slug])
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' })
    const images = await pool.query(`SELECT url, position FROM product_images WHERE product_id = $1 ORDER BY position`, [rows[0].id])
    res.json({ ...rows[0], images: images.rows })
  } catch (err) {
    next(err)
  }
})

const productSchema = z.object({
  sku: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  collectionSlug: z.string().min(1),
  category: z.enum(['Rings', 'Earrings', 'Pendants', 'Bracelets', 'Chains', 'Necklaces']),
  pricePkr: z.number().int().nonnegative(),
  description: z.string().default(''),
  sizes: z.array(z.string()).optional(),
  availability: z.enum(['available', 'enquire']).default('available'),
  productionDays: z.string().default('5–7 working days'),
  isBestseller: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  hasGemstone: z.boolean().default(false),
  purity925: z.boolean().default(false),
})

// Admin: create product
productsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const p = productSchema.parse(req.body)
    const { rows } = await pool.query(
      `INSERT INTO products (sku, slug, name, collection_slug, category, price_pkr, description, sizes, availability, production_days, is_bestseller, is_premium, has_gemstone, purity_925)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [p.sku, p.slug, p.name, p.collectionSlug, p.category, p.pricePkr, p.description, p.sizes ?? null, p.availability, p.productionDays, p.isBestseller, p.isPremium, p.hasGemstone, p.purity925],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

// Admin: update product (price, publish state, lead time, etc.)
productsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const partial = productSchema.partial().extend({ published: z.boolean().optional() }).parse(req.body)
    const fields: Record<string, unknown> = {
      sku: partial.sku, slug: partial.slug, name: partial.name, collection_slug: partial.collectionSlug,
      category: partial.category, price_pkr: partial.pricePkr, description: partial.description,
      sizes: partial.sizes, availability: partial.availability, production_days: partial.productionDays,
      is_bestseller: partial.isBestseller, is_premium: partial.isPremium, has_gemstone: partial.hasGemstone,
      purity_925: partial.purity925, published: partial.published,
    }
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClause = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
    const { rows } = await pool.query(
      `UPDATE products SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id, ...entries.map(([, v]) => v)],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})
