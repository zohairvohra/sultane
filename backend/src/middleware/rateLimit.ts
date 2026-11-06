import type { NextFunction, Request, Response } from 'express'

// Minimal in-memory sliding-window limiter — fine for a single-instance
// deployment. For multi-instance production, replace with a Redis-backed
// limiter (e.g. rate-limiter-flexible) behind the reverse proxy.
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>()

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    recent.push(now)
    hits.set(key, recent)

    if (recent.length > max) {
      return res.status(429).json({ error: 'Too many attempts. Please wait a moment and try again.' })
    }
    next()
  }
}
