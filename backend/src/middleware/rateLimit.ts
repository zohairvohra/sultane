import type { NextFunction, Request, Response } from 'express'

// In-memory sliding-window limiter — adequate for a single-instance
// deployment. For multiple instances, back this with Redis.
export function rateLimit({ windowMs, max, message }: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, number[]>()

  // Periodically drop stale keys so the map cannot grow unbounded.
  setInterval(() => {
    const now = Date.now()
    for (const [key, times] of hits) {
      const recent = times.filter((t) => now - t < windowMs)
      if (recent.length) hits.set(key, recent)
      else hits.delete(key)
    }
  }, windowMs).unref()

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    recent.push(now)
    hits.set(key, recent)

    if (recent.length > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000))
      return res.status(429).json({ error: message ?? 'Too many attempts. Please wait a moment and try again.' })
    }
    next()
  }
}
