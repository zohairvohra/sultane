import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads')
// Public: product images, collection images, hero media — served statically.
export const PUBLIC_DIR = path.join(UPLOAD_ROOT, 'public')
// Private: payment receipts and customer reference images — served only
// through authenticated admin routes, never statically.
export const PRIVATE_DIR = path.join(UPLOAD_ROOT, 'private')

for (const dir of [PUBLIC_DIR, PRIVATE_DIR]) fs.mkdirSync(dir, { recursive: true })

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function storage(dir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  })
}

function filter(exts: Set<string>, mimes: Set<string>, message: string): multer.Options['fileFilter'] {
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!exts.has(ext) || !mimes.has(file.mimetype)) return cb(new UploadError(message))
    cb(null, true)
  }
}

export class UploadError extends Error {}

// Customer reference / inspiration images (private)
export const enquiryUpload = multer({
  storage: storage(PRIVATE_DIR),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: filter(IMAGE_EXT, IMAGE_MIME, 'Only JPG, PNG or WebP images are allowed'),
})

// Payment receipts (private) — images or PDF
export const proofUpload = multer({
  storage: storage(PRIVATE_DIR),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: filter(
    new Set([...IMAGE_EXT, '.pdf']),
    new Set([...IMAGE_MIME, 'application/pdf']),
    'Upload a JPG, PNG, WebP or PDF receipt',
  ),
})

// Product / collection imagery (public)
export const imageUpload = multer({
  storage: storage(PUBLIC_DIR),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: filter(IMAGE_EXT, IMAGE_MIME, 'Only JPG, PNG or WebP images are allowed'),
})

// Homepage hero video or poster (public)
export const mediaUpload = multer({
  storage: storage(PUBLIC_DIR),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter: filter(
    new Set([...IMAGE_EXT, '.mp4', '.webm']),
    new Set([...IMAGE_MIME, 'video/mp4', 'video/webm']),
    'Upload an MP4/WebM video or a JPG/PNG/WebP image',
  ),
})

export const publicUrl = (filename: string) => `/uploads/${filename}`

export function safeUnlink(dir: string, filename: string | null | undefined) {
  if (!filename) return
  const full = path.join(dir, path.basename(filename))
  fs.promises.unlink(full).catch(() => undefined)
}
