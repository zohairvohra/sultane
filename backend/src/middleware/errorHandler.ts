import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'
import { UploadError } from './upload'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    const first = err.issues[0]
    const field = first?.path.join('.')
    return res.status(400).json({ error: field ? `${field}: ${first.message}` : 'Validation failed', details: err.issues })
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if (err instanceof UploadError) return res.status(400).json({ error: err.message })
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.code === 'LIMIT_FILE_COUNT' ? 'Too many files' : err.message
    return res.status(400).json({ error: msg })
  }
  const pg = err as { code?: string; constraint?: string }
  if (pg?.code === '23505') return res.status(409).json({ error: `Already exists (${pg.constraint ?? 'duplicate value'})` })
  if (pg?.code === '23503') return res.status(409).json({ error: 'This record is referenced elsewhere and cannot be changed that way' })

  console.error(err)
  // Never leak internal error details to clients in production.
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: message })
}
