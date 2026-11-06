import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from '../db/pool'
import { requireAuth, requireCustomer, signAdminToken, signCustomerToken, type AuthedRequest } from '../middleware/auth'
import { HttpError } from '../middleware/errorHandler'
import { rateLimit } from '../middleware/rateLimit'
import { normalisePhone } from '../utils/refs'

export const authRouter = Router()

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, message: 'Too many sign-in attempts. Please wait 15 minutes.' })

// ── Admin ────────────────────────────────────────────────────
authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body)
  const { rows } = await pool.query(`SELECT id, name, email, password_hash, role FROM admin_users WHERE lower(email) = lower($1)`, [email])
  const admin = rows[0]
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  res.json({ token: signAdminToken(admin), admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } })
})

authRouter.post('/change-password', requireAuth, async (req: AuthedRequest, res) => {
  const { current, next } = z.object({ current: z.string().min(1), next: z.string().min(10, 'Use at least 10 characters') }).parse(req.body)
  const { rows } = await pool.query(`SELECT password_hash FROM admin_users WHERE id = $1`, [req.admin!.id])
  if (!rows[0] || !(await bcrypt.compare(current, rows[0].password_hash))) throw new HttpError(400, 'Current password is incorrect')
  await pool.query(`UPDATE admin_users SET password_hash = $2 WHERE id = $1`, [req.admin!.id, await bcrypt.hash(next, 12)])
  res.json({ ok: true })
})

// ── Optional customer accounts ───────────────────────────────
const phoneField = z.string().trim().transform(normalisePhone).refine((p) => /^92\d{10}$/.test(p), 'Enter a valid Pakistani mobile number')

authRouter.post('/customer/register', loginLimiter, async (req, res) => {
  const b = z
    .object({
      name: z.string().trim().min(2).max(120),
      phone: phoneField,
      email: z.string().trim().email().optional().or(z.literal('')),
      password: z.string().min(8, 'Use at least 8 characters').max(200),
    })
    .parse(req.body)
  const exists = await pool.query(`SELECT 1 FROM customers WHERE phone = $1`, [b.phone])
  if (exists.rowCount) throw new HttpError(409, 'An account with this phone number already exists — please sign in')
  const { rows } = await pool.query(
    `INSERT INTO customers (name, phone, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, name, phone, email`,
    [b.name, b.phone, b.email || null, await bcrypt.hash(b.password, 12)],
  )
  res.status(201).json({ token: signCustomerToken(rows[0]), customer: rows[0] })
})

authRouter.post('/customer/login', loginLimiter, async (req, res) => {
  const b = z.object({ phone: phoneField, password: z.string().min(1) }).parse(req.body)
  const { rows } = await pool.query(`SELECT * FROM customers WHERE phone = $1`, [b.phone])
  const c = rows[0]
  if (!c || !(await bcrypt.compare(b.password, c.password_hash))) return res.status(401).json({ error: 'Incorrect phone number or password' })
  res.json({ token: signCustomerToken(c), customer: { id: c.id, name: c.name, phone: c.phone, email: c.email } })
})

authRouter.get('/customer/me', requireCustomer, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(`SELECT id, name, phone, email FROM customers WHERE id = $1`, [req.customer!.id])
  if (!rows[0]) return res.status(401).json({ error: 'Account not found' })
  res.json(rows[0])
})
