import { Router } from 'express'
import { pool } from '../db/pool'
import { requireAuth } from '../middleware/auth'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)

// Revenue counts ONLY orders whose payment has been manually verified.
// Submitted-but-unverified orders are reported separately as outstanding.
reportsRouter.get('/summary', async (_req, res) => {
  const live = `order_status <> 'cancelled'`
  const [counts, revenue, outstanding, pipeline, bestsellers, promoUsage, enquiries, loyalty] = await Promise.all([
    pool.query(`SELECT count(*)::int AS submitted,
                       count(*) FILTER (WHERE payment_status = 'verified')::int AS verified,
                       count(*) FILTER (WHERE order_status = 'cancelled')::int AS cancelled
                FROM orders`),
    pool.query(`SELECT coalesce(sum(total_pkr), 0)::int AS total,
                       coalesce(sum(total_pkr) FILTER (WHERE verified_at >= date_trunc('month', now())), 0)::int AS this_month
                FROM orders WHERE payment_status = 'verified' AND ${live}`),
    pool.query(`SELECT coalesce(sum(total_pkr), 0)::int AS total, count(*)::int AS count,
                       count(*) FILTER (WHERE payment_status = 'proof-submitted')::int AS proofs_to_review,
                       count(*) FILTER (WHERE payment_status = 'flagged')::int AS flagged
                FROM orders WHERE payment_status <> 'verified' AND order_status IN ('awaiting-payment','pending-price')`),
    pool.query(`SELECT order_status, count(*)::int AS count FROM orders WHERE ${live} GROUP BY order_status`),
    pool.query(`SELECT oi.product_name, oi.sku, sum(oi.qty)::int AS units, sum(oi.qty * oi.unit_price_pkr)::int AS revenue
                FROM order_items oi JOIN orders o ON o.id = oi.order_id
                WHERE o.payment_status = 'verified' AND o.${live} AND NOT oi.is_custom
                GROUP BY oi.product_name, oi.sku ORDER BY units DESC LIMIT 8`),
    pool.query(`SELECT p.code, p.kind, p.redemption_count, p.max_redemptions, p.active,
                       coalesce(sum(r.amount_pkr), 0)::int AS total_discount
                FROM promo_codes p LEFT JOIN promo_redemptions r ON r.code = p.code
                GROUP BY p.code ORDER BY p.redemption_count DESC LIMIT 10`),
    pool.query(`SELECT count(*) FILTER (WHERE status = 'new')::int AS new, count(*)::int AS total FROM enquiries`),
    pool.query(`SELECT count(*)::int AS issued, count(redeemed_at)::int AS redeemed FROM loyalty_rewards`),
  ])

  const byStatus = Object.fromEntries(pipeline.rows.map((r: { order_status: string; count: number }) => [r.order_status, r.count]))
  res.json({
    orders: counts.rows[0],
    verifiedRevenuePkr: revenue.rows[0].total,
    verifiedRevenueThisMonthPkr: revenue.rows[0].this_month,
    outstanding: outstanding.rows[0],
    byStatus,
    awaitingProduction: byStatus['payment-verified'] ?? 0,
    inProduction: (byStatus['in-production'] ?? 0) + (byStatus['quality-check'] ?? 0),
    awaitingDispatch: byStatus['ready-for-dispatch'] ?? 0,
    bestsellers: bestsellers.rows,
    promoUsage: promoUsage.rows,
    enquiries: enquiries.rows[0],
    loyalty: loyalty.rows[0],
  })
})
