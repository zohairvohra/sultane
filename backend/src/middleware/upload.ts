import multer from 'multer'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomUUID()}${ext}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED.has(ext)) return cb(new Error('Only JPG, PNG or WebP files are allowed'))
    cb(null, true)
  },
})
