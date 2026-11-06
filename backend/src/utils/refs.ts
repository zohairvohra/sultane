import { randomInt, randomBytes } from 'node:crypto'

export function generateOrderRef() {
  const year = new Date().getFullYear()
  const n = randomInt(100000, 999999)
  return `SLT-${year}-${n}`
}

export function generateEnquiryRef() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const suffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `SLT-ENQ-${date}-${suffix}`
}

// SLT-XXXX-XXXX-XXXX — unguessable per-piece article code
export function generateArticleCode() {
  const group = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `SLT-${group()}-${group()}-${group()}`
}
