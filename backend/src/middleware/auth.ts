import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

type AdminRole = 'owner' | 'staff' | 'viewer'

export interface AuthedRequest extends Request {
  admin?: { id: string; email: string; role: AdminRole }
  customer?: { id: string; phone: string }
}

const secret = () => process.env.JWT_SECRET!

export function signAdminToken(admin: { id: string; email: string; role: string }) {
  return jwt.sign({ kind: 'admin', id: admin.id, email: admin.email, role: admin.role }, secret(), { expiresIn: '12h' })
}

export function signCustomerToken(customer: { id: string; phone: string }) {
  return jwt.sign({ kind: 'customer', id: customer.id, phone: customer.phone }, secret(), { expiresIn: '30d' })
}

function bearer(req: Request) {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = bearer(req)
  if (!token) return res.status(401).json({ error: 'Sign in required' })
  try {
    const payload = jwt.verify(token, secret()) as { kind?: string; id: string; email: string; role: AdminRole }
    if (payload.kind !== 'admin') return res.status(401).json({ error: 'Admin sign in required' })
    req.admin = { id: payload.id, email: payload.email, role: payload.role }
    // Viewers can read the dashboard but never change anything.
    if (payload.role === 'viewer' && req.method !== 'GET') {
      return res.status(403).json({ error: 'Your role is read-only' })
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again' })
  }
}

// Owner-only areas: settings, promotions, deleting products, registry corrections.
export function requireOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.admin?.role !== 'owner') return res.status(403).json({ error: 'Only the owner can do this' })
  next()
}

export function requireCustomer(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = bearer(req)
  if (!token) return res.status(401).json({ error: 'Please sign in' })
  try {
    const payload = jwt.verify(token, secret()) as { kind?: string; id: string; phone: string }
    if (payload.kind !== 'customer') return res.status(401).json({ error: 'Please sign in' })
    req.customer = { id: payload.id, phone: payload.phone }
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again' })
  }
}

// Attaches the customer if a valid customer token is present, otherwise continues as guest.
export function optionalCustomer(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = bearer(req)
  if (token) {
    try {
      const payload = jwt.verify(token, secret()) as { kind?: string; id: string; phone: string }
      if (payload.kind === 'customer') req.customer = { id: payload.id, phone: payload.phone }
    } catch {
      /* treat as guest */
    }
  }
  next()
}
