import type { PoolClient } from 'pg'
import { z } from 'zod'
import { pool } from '../db/pool'
import { getSettings } from '../db/settings'
import { HttpError } from '../middleware/errorHandler'

// Server-side pricing — the single source of truth for every total the
// customer sees and every amount recorded on an order. The client only
// ever sends product IDs, sizes, quantities and the testing choice.

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  size: z.string().max(40).optional(),
  qty: z.number().int().min(1).max(20),
  gemstoneTesting: z.boolean().optional(),
})
export type CartItem = z.infer<typeof cartItemSchema>

type Queryable = Pick<PoolClient, 'query'>

export interface PricedLine {
  product: {
    id: string
    sku: string
    name: string
    category: string
    price_pkr: number
    sizes: string[] | null
    testing_available: boolean
    collections: string[]
  }
  size: string | null
  qty: number
  gemstoneTesting: boolean
  testingFeePkr: number
  lineTotal: number
}

export interface Quote {
  lines: PricedLine[]
  subtotal: number
  testingFees: number
  delivery: number
  discount: number
  total: number
  promo: { code: string; applied: boolean; message: string; description?: string } | null
}

export function isKarachi(city: string) {
  return city.trim().toLowerCase() === 'karachi'
}

export async function deliveryFeeFor(city: string | undefined, db: Queryable = pool) {
  const s = await getSettings(['delivery_fee_karachi_pkr', 'delivery_fee_other_pkr'], db)
  if (!city) return null
  return isKarachi(city) ? Number(s.delivery_fee_karachi_pkr ?? 0) : Number(s.delivery_fee_other_pkr ?? 350)
}

export async function priceItems(items: CartItem[], db: Queryable = pool): Promise<PricedLine[]> {
  const ids = [...new Set(items.map((i) => i.productId))]
  const { rows } = await db.query(
    `SELECT p.id, p.sku, p.name, p.category, p.price_pkr, p.sizes, p.status, p.is_premium, p.testing_available,
            p.gemstone_type,
            coalesce(array_agg(pc.collection_slug) FILTER (WHERE pc.collection_slug IS NOT NULL), '{}') AS collections
     FROM products p LEFT JOIN product_collections pc ON pc.product_id = p.id
     WHERE p.id = ANY($1::uuid[]) GROUP BY p.id`,
    [ids],
  )
  const fee = Number((await getSettings(['gemstone_testing_fee_pkr'], db)).gemstone_testing_fee_pkr ?? 799)

  return items.map((item) => {
    const product = rows.find((p: { id: string }) => p.id === item.productId)
    if (!product || product.status === 'draft') throw new HttpError(400, 'One of the pieces in your bag is no longer available')
    if (product.status === 'paused') throw new HttpError(400, `${product.name} is temporarily unavailable to order`)
    if (product.sizes?.length) {
      if (!item.size || !product.sizes.includes(item.size)) throw new HttpError(400, `Please choose a valid size for ${product.name}`)
    }
    // Testing is only possible on eligible Premium pieces, whatever the client sends.
    const eligible = product.is_premium && product.testing_available && !!product.gemstone_type
    const gemstoneTesting = eligible && !!item.gemstoneTesting
    const testingFeePkr = gemstoneTesting ? fee : 0
    return {
      product,
      size: product.sizes?.length ? item.size! : null,
      qty: item.qty,
      gemstoneTesting,
      testingFeePkr,
      lineTotal: product.price_pkr * item.qty,
    }
  })
}

interface PromoRow {
  code: string
  description: string | null
  kind: 'campaign' | 'loyalty'
  discount_type: 'percent' | 'flat'
  discount_value: number
  min_order_pkr: number
  max_redemptions: number | null
  per_phone_limit: number | null
  redemption_count: number
  starts_at: Date | null
  expires_at: Date | null
  active: boolean
  collection_slugs: string[] | null
  product_ids: string[] | null
  restricted_phone: string | null
}

// Evaluates a promotional code against priced lines. Returns the discount
// and a customer-facing message; never throws for an invalid code.
export async function evaluatePromo(
  rawCode: string,
  lines: PricedLine[],
  phone: string | undefined,
  db: Queryable = pool,
  lock = false,
): Promise<{ promo: PromoRow | null; discount: number; message: string }> {
  const code = rawCode.trim().toUpperCase()
  const { rows } = await db.query(`SELECT * FROM promo_codes WHERE code = $1 ${lock ? 'FOR UPDATE' : ''}`, [code])
  const promo = rows[0] as PromoRow | undefined
  const now = new Date()

  if (!promo || !promo.active) return { promo: null, discount: 0, message: 'This code is not recognised' }
  if (promo.starts_at && promo.starts_at > now) return { promo: null, discount: 0, message: 'This code is not active yet' }
  if (promo.expires_at && promo.expires_at <= now) return { promo: null, discount: 0, message: 'This code has expired' }
  if (promo.max_redemptions != null && promo.redemption_count >= promo.max_redemptions) {
    return { promo: null, discount: 0, message: 'This code has reached its usage limit' }
  }
  if (promo.restricted_phone) {
    if (!phone) return { promo: null, discount: 0, message: 'Enter the phone number this reward was issued to at checkout' }
    if (phone !== promo.restricted_phone) return { promo: null, discount: 0, message: 'This reward code belongs to a different customer' }
  }
  if (promo.per_phone_limit != null && phone) {
    const used = await db.query(`SELECT count(*)::int AS n FROM promo_redemptions WHERE code = $1 AND phone = $2`, [code, phone])
    if (used.rows[0].n >= promo.per_phone_limit) return { promo: null, discount: 0, message: 'You have already used this code' }
  }

  const scoped = (promo.collection_slugs?.length ?? 0) > 0 || (promo.product_ids?.length ?? 0) > 0
  const eligibleLines = scoped
    ? lines.filter(
        (l) =>
          promo.product_ids?.includes(l.product.id) ||
          l.product.collections.some((c) => promo.collection_slugs?.includes(c)),
      )
    : lines
  const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.lineTotal, 0)

  if (eligibleSubtotal === 0) return { promo: null, discount: 0, message: 'This code does not apply to the pieces in your bag' }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  if (subtotal < promo.min_order_pkr) {
    return { promo: null, discount: 0, message: `This code needs a minimum order of Rs. ${promo.min_order_pkr.toLocaleString('en-PK')}` }
  }

  const discount =
    promo.discount_type === 'percent'
      ? Math.round((eligibleSubtotal * Math.min(100, promo.discount_value)) / 100)
      : Math.min(promo.discount_value, eligibleSubtotal)

  return { promo, discount, message: promo.description || 'Code applied' }
}

export async function buildQuote(
  input: { items: CartItem[]; city?: string; promoCode?: string; phone?: string },
  db: Queryable = pool,
  lockPromo = false,
): Promise<Quote & { promoRow: PromoRow | null }> {
  const lines = await priceItems(input.items, db)
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const testingFees = lines.reduce((s, l) => s + l.testingFeePkr * l.qty, 0)
  const delivery = (await deliveryFeeFor(input.city, db)) ?? 0

  let discount = 0
  let promo: Quote['promo'] = null
  let promoRow: PromoRow | null = null
  if (input.promoCode?.trim()) {
    const result = await evaluatePromo(input.promoCode, lines, input.phone, db, lockPromo)
    discount = result.discount
    promoRow = result.promo
    promo = {
      code: input.promoCode.trim().toUpperCase(),
      applied: !!result.promo,
      message: result.message,
      description: result.promo?.description ?? undefined,
    }
  }

  const total = Math.max(0, subtotal + testingFees + delivery - discount)
  return { lines, subtotal, testingFees, delivery, discount, total, promo, promoRow }
}
