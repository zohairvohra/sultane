import { randomInt } from 'node:crypto'

// Unambiguous alphabet (no 0/O, 1/I/L) so article numbers survive being
// read off a printed card or typed from a WhatsApp message.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function randomChars(n: number) {
  let out = ''
  for (let i = 0; i < n; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

export function generateOrderRef() {
  return `SLT-${new Date().getFullYear()}-${randomInt(100000, 999999)}`
}

export function generateEnquiryRef() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `ENQ-${date}-${randomChars(4)}`
}

// SLT-XXXX-XXXX-XXXX — 31^12 ≈ 7.9 × 10^17 combinations. Combined with
// rate-limited lookups this makes guessing a valid number impractical.
export function generateArticleCode() {
  return `SLT-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`
}

export function generateLoyaltyCode() {
  return `THANKYOU-${randomChars(6)}`
}

export const ARTICLE_CODE_PATTERN = /^SLT-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/

export function normaliseArticleCode(raw: string) {
  const compact = raw.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (compact.length !== 15 || !compact.startsWith('SLT')) return null
  const code = `SLT-${compact.slice(3, 7)}-${compact.slice(7, 11)}-${compact.slice(11, 15)}`
  return ARTICLE_CODE_PATTERN.test(code) ? code : null
}

// Pakistani mobile numbers arrive as 0300 1234567, +92 300 1234567,
// 92-300-1234567 … normalise to 923001234567 so lookups match.
export function normalisePhone(raw: string) {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0092')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('3')) digits = `92${digits}`
  return digits
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
