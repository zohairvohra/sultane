import type { Collection, CustomerOrder, Product, SiteSettings } from '../data/types'

const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
// Uploaded media is served from the API origin at /uploads/…
const ASSET_ORIGIN = BASE.replace(/\/api$/, '')

export function assetUrl(url: string | null | undefined) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return url.startsWith('/uploads/') ? `${ASSET_ORIGIN}${url}` : url
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'Could not reach SULTANÉ. Please check your connection and try again.')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`)
  return data as T
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })

// Fetch a private file (receipt / reference image) with the admin token.
export async function fetchPrivateBlobUrl(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new ApiError(res.status, 'Could not load file')
  return URL.createObjectURL(await res.blob())
}

// ── Mapping DB rows → frontend types ──────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapProduct(p: any): Product {
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price_pkr,
    description: p.description ?? '',
    sizes: p.sizes ?? [],
    status: p.status,
    productionTime: p.production_time,
    isBestseller: p.is_bestseller,
    isPremium: p.is_premium,
    isMens: p.is_mens,
    allowCustomisation: p.allow_customisation,
    purity925: p.purity_925,
    materialNote: p.material_note,
    gemstone: p.gemstone_type ? { type: p.gemstone_type, origin: p.gemstone_origin, details: p.gemstone_details } : null,
    testingAvailable: p.testing_available,
    certificationInfo: p.certification_info,
    position: p.position,
    collections: p.collections ?? [],
    images: p.images ?? [],
  }
}

function mapCollection(c: any): Collection {
  return {
    slug: c.slug,
    name: c.name,
    tagline: c.tagline ?? '',
    description: c.description ?? '',
    imageUrl: c.image_url,
    position: c.position,
    productCount: c.product_count ?? 0,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Public: settings & catalogue ──────────────────────────────
export const getSettings = () => request<Partial<SiteSettings>>('/settings')

export async function getCollections(): Promise<Collection[]> {
  return (await request<unknown[]>('/collections')).map(mapCollection)
}

export interface ProductQuery {
  category?: string
  collection?: string
  gemstone?: string
  mens?: '1' | '0'
  premium?: '1'
  bestseller?: '1'
  q?: string
  sort?: string
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString()
  return (await request<unknown[]>(`/products${qs ? `?${qs}` : ''}`)).map(mapProduct)
}

export const getGemstoneTypes = () => request<string[]>('/products/gemstones')

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    return mapProduct(await request(`/products/${encodeURIComponent(slug)}`))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// ── Public: pricing & checkout ────────────────────────────────
export interface CartItemPayload {
  productId: string
  size?: string
  qty: number
  gemstoneTesting?: boolean
}

export interface Quote {
  subtotal: number
  testingFees: number
  delivery: number | null
  discount: number
  total: number
  promo: { code: string; applied: boolean; message: string; description?: string } | null
}

export const getQuote = (body: { items: CartItemPayload[]; city?: string; promoCode?: string; phone?: string }) =>
  request<Quote>('/orders/quote', json('POST', body))

export interface CheckoutPayload {
  customer: { name: string; phone: string; email?: string; street: string; area?: string; city: string; province?: string; notes?: string }
  items: CartItemPayload[]
  promoCode?: string
  acceptPolicies: true
}

export const placeOrder = (payload: CheckoutPayload, customerToken?: string | null) =>
  request<CustomerOrder>('/orders', json('POST', payload), customerToken)

export const lookupOrder = (ref: string, phone: string) => request<CustomerOrder>('/orders/lookup', json('POST', { ref, phone }))

export function uploadPaymentProof(ref: string, phone: string, file: File) {
  const fd = new FormData()
  fd.append('phone', phone)
  fd.append('proof', file)
  return request<CustomerOrder>(`/orders/${encodeURIComponent(ref)}/payment-proof`, { method: 'POST', body: fd })
}

// ── Public: enquiries & verification ──────────────────────────
export const submitEnquiry = (formData: FormData) => request<{ ref: string; productName: string | null }>('/enquiries', { method: 'POST', body: formData })

export interface VerificationResult {
  code: string
  customerName: string
  productName: string
  purchaseDate: string
}

export async function verifyArticle(code: string): Promise<VerificationResult | null> {
  try {
    return await request<VerificationResult>(`/articles/verify/${encodeURIComponent(code)}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// ── Customer accounts ─────────────────────────────────────────
export interface CustomerSession {
  token: string
  customer: { id: string; name: string; phone: string; email: string | null }
}

export const customerRegister = (b: { name: string; phone: string; email?: string; password: string }) =>
  request<CustomerSession>('/auth/customer/register', json('POST', b))
export const customerLogin = (phone: string, password: string) =>
  request<CustomerSession>('/auth/customer/login', json('POST', { phone, password }))
export const getMyOrders = (token: string) =>
  request<{ ref: string; created_at: string; order_status: string; payment_status: string; total_pkr: number; item_count: number }[]>('/orders/mine', {}, token)
export const getMyOrder = (token: string, ref: string) => request<CustomerOrder>(`/orders/mine/${encodeURIComponent(ref)}`, {}, token)

// ══ Admin ═════════════════════════════════════════════════════
export interface AdminSession {
  token: string
  admin: { id: string; name: string; email: string; role: 'owner' | 'staff' | 'viewer' }
}

export const adminLogin = (email: string, password: string) => request<AdminSession>('/auth/login', json('POST', { email, password }))
export const adminChangePassword = (t: string, current: string, next: string) => request('/auth/change-password', json('POST', { current, next }), t)

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

export const admin = {
  // reports
  summary: (t: string) => request<Row>('/reports/summary', {}, t),

  // orders
  orders: (t: string, f: { status?: string; paymentStatus?: string; search?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString()
    return request<Row[]>(`/orders${qs ? `?${qs}` : ''}`, {}, t)
  },
  order: (t: string, ref: string) => request<Row>(`/orders/admin/${encodeURIComponent(ref)}`, {}, t),
  verifyPayment: (t: string, id: string) => request<{ ok: true; articleCodes: { code: string; productName: string }[] }>(`/orders/${id}/verify-payment`, json('POST'), t),
  flagPayment: (t: string, id: string, note: string) => request(`/orders/${id}/flag-payment`, json('POST', { note }), t),
  setStatus: (t: string, id: string, body: Row) => request<Row>(`/orders/${id}/status`, json('PATCH', body), t),
  setCourier: (t: string, id: string, body: Row) => request<Row>(`/orders/${id}/courier`, json('PATCH', body), t),
  setNotes: (t: string, id: string, adminNotes: string) => request(`/orders/${id}/notes`, json('PATCH', { adminNotes }), t),
  setPrice: (t: string, id: string, body: Row) => request<Row>(`/orders/${id}/price`, json('PATCH', body), t),
  issueLoyalty: (t: string, id: string) => request<Row>(`/orders/${id}/loyalty`, json('POST'), t),
  markLoyaltySent: (t: string, code: string) => request<Row>(`/orders/loyalty/${encodeURIComponent(code)}/sent`, json('POST'), t),

  // enquiries
  enquiries: (t: string, f: { status?: string; type?: string; search?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString()
    return request<Row[]>(`/enquiries${qs ? `?${qs}` : ''}`, {}, t)
  },
  enquiry: (t: string, ref: string) => request<Row>(`/enquiries/${encodeURIComponent(ref)}`, {}, t),
  updateEnquiry: (t: string, id: string, body: Row) => request<Row>(`/enquiries/${id}`, json('PATCH', body), t),
  convertEnquiry: (t: string, id: string, body: Row) => request<{ ref: string }>(`/enquiries/${id}/convert`, json('POST', body), t),

  // catalogue
  products: async (t: string) => (await request<Row[]>('/products/admin/all', {}, t)).map(mapProduct),
  product: async (t: string, id: string) => mapProduct(await request<Row>(`/products/admin/${id}`, {}, t)),
  createProduct: async (t: string, body: Row) => mapProduct(await request<Row>('/products', json('POST', body), t)),
  updateProduct: async (t: string, id: string, body: Row) => mapProduct(await request<Row>(`/products/${id}`, json('PATCH', body), t)),
  deleteProduct: (t: string, id: string) => request(`/products/${id}`, { method: 'DELETE' }, t),
  uploadImages: async (t: string, id: string, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('images', f))
    return mapProduct(await request<Row>(`/products/${id}/images`, { method: 'POST', body: fd }, t))
  },
  reorderImages: async (t: string, id: string, imageIds: string[]) =>
    mapProduct(await request<Row>(`/products/${id}/images/order`, json('PUT', { imageIds }), t)),
  deleteImage: async (t: string, id: string, imageId: string) =>
    mapProduct(await request<Row>(`/products/${id}/images/${imageId}`, { method: 'DELETE' }, t)),

  // collections
  createCollection: (t: string, body: Row) => request<Row>('/collections', json('POST', body), t),
  updateCollection: (t: string, slug: string, body: Row) => request<Row>(`/collections/${slug}`, json('PATCH', body), t),
  deleteCollection: (t: string, slug: string) => request(`/collections/${slug}`, { method: 'DELETE' }, t),
  uploadCollectionImage: (t: string, slug: string, file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return request<Row>(`/collections/${slug}/image`, { method: 'POST', body: fd }, t)
  },

  // article registry
  articles: (t: string, search = '') => request<Row[]>(`/articles${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, t),
  updateArticle: (t: string, id: string, body: Row) => request<Row>(`/articles/${id}`, json('PATCH', body), t),

  // promotions
  promos: (t: string) => request<Row[]>('/promos', {}, t),
  loyalty: (t: string) => request<Row[]>('/promos/loyalty', {}, t),
  loyaltyEligible: (t: string) => request<Row[]>('/promos/loyalty/eligible', {}, t),
  createPromo: (t: string, body: Row) => request<Row>('/promos', json('POST', body), t),
  updatePromo: (t: string, code: string, body: Row) => request<Row>(`/promos/${encodeURIComponent(code)}`, json('PATCH', body), t),
  deletePromo: (t: string, code: string) => request<Row | undefined>(`/promos/${encodeURIComponent(code)}`, { method: 'DELETE' }, t),

  // settings
  saveSetting: (t: string, key: string, value: unknown) => request<Row>(`/settings/${key}`, json('PUT', { value }), t),
  uploadMedia: (t: string, key: 'hero_video_url' | 'hero_poster_url', file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<{ key: string; value: string }>(`/settings/media/${key}`, { method: 'POST', body: fd }, t)
  },
}
