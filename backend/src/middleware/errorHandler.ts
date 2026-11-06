import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() })
  }
  console.error(err)
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: message })
}
