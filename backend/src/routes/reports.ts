import { Router } from 'express'
import { pool } from '../db/pool'
import { requireAuth } from '../middleware/auth'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)

// Revenue only counts orders with a verified payment — an unverified
// COD or pending bank transfer is never treated as confirmed revenue.
reportsRouter.get('/summary', async (_req, res, next) => {
  try {
    const [totalOrders, revenue, outstanding, inProgress, bestsellers, promoUsage] = await Promise.all([
      pool.query(`SELECT count(*)::int AS count FROM orders`),
      pool.query(`SELECT coalesce(sum(total_pkr), 0)::int AS total FROM orders WHERE payment_status = 'verified'`),
      pool.query(`SELECT coalesce(sum(total_pkr), 0)::int AS total, count(*)::int AS count FROM orders WHERE payment_status != 'verified'`),
      pool.query(`SELECT count(*)::int AS count FROM orders WHERE order_status IN ('preparing','quality-check','ready-for-dispatch')`),
      pool.query(
        `SELECT product_name, collection_slug, sum(qty)::int AS units_sold
         FROM order_items GROUP BY product_name, collection_slug ORDER BY units_sold DESC LIMIT 5`,
      ),
      pool.query(
        `SELECT code, redemption_count, max_redemptions FROM promo_codes ORDER BY redemption_count DESC LIMIT 10`,
      ),
    ])

    res.json({
      totalOrders: totalOrders.rows[0].count,
      verifiedRevenuePkr: revenue.rows[0].total,
      outstandingPayments: outstanding.rows[0],
      ordersInProduction: inProgress.rows[0].count,
      bestsellers: bestsellers.rows,
      promoUsage: promoUsage.rows,
    })
  } catch (err) {
    next(err)
  }
})
