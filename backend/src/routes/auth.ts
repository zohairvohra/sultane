import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { pool } from '../db/pool'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const { rows } = await pool.query(
      `SELECT id, name, email, password_hash, role FROM admin_users WHERE email = $1`,
      [email],
    )
    const admin = rows[0]
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' },
    )

    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } })
  } catch (err) {
    next(err)
  }
})
