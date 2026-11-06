import type { Collection, Product } from '../data/types'

const BASE = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  if (!(options.body instanceof FormData) && options.body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`)
  return data as T
}

// ── Mapping: DB snake_case rows → frontend camelCase types ──────
interface ApiProduct {
  id: string
  sku: string
  slug: string
  name: string
  collection_slug: Product['collection']
  category: Product['category']
  price_pkr: number
  description: string
  sizes: string[] | null
  availability: Product['availability']
  production_days: string
  is_bestseller: boolean
  is_premium: boolean
  has_gemstone: boolean
  purity_925: boolean
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    collection: p.collection_slug,
    category: p.category,
    price: p.price_pkr,
    description: p.description,
    sizes: p.sizes ?? undefined,
    availability: p.availability,
    productionDays: p.production_days,
    isBestseller: p.is_bestseller,
    isPremium: p.is_premium,
    hasGemstone: p.has_gemstone,
    purity925: p.purity_925,
  }
}

// ── Public: catalogue ─────────────────────────────────────────
export async function getCollections(): Promise<Collection[]> {
  return request<Collection[]>('/collections')
}

export async function getProducts(): Promise<Product[]> {
  const rows = await request<ApiProduct[]>('/products')
  return rows.map(mapProduct)
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    const row = await request<ApiProduct>(`/products/${slug}`)
    return mapProduct(row)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// ── Public: checkout ──────────────────────────────────────────
export interface CheckoutPayload {
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
    street: string
    area?: string
    city: string
    province: string
    postalCode?: string
    notes?: string
  }
  items: { productId: string; size?: string; qty: number; gemstoneTesting?: boolean }[]
  paymentMethod: 'cod' | 'bank-transfer'
  promoCode?: string
}

export interface CheckoutResult {
  ref: string
  total: number
  subtotal: number
  testingFees: number
  delivery: number
  discount: number
}

export async function createOrder(payload: CheckoutPayload): Promise<CheckoutResult> {
  return request<CheckoutResult>('/orders', { method: 'POST', body: JSON.stringify(payload) })
}

export async function trackOrder(ref: string, phone: string) {
  return request<{
    ref: string
    order_status: string
    payment_status: string
    payment_method: string
    courier_name: string | null
    tracking_number: string | null
    tracking_url: string | null
    dispatched_at: string | null
    created_at: string
  }>(`/orders/track/${encodeURIComponent(ref)}?phone=${encodeURIComponent(phone)}`)
}

// ── Public: enquiries ──────────────────────────────────────────
export async function submitEnquiry(formData: FormData): Promise<{ ref: string }> {
  return request<{ ref: string }>('/enquiries', { method: 'POST', body: formData })
}

// ── Public: article registry ────────────────────────────────────
export interface ArticleLookupResult {
  code: string
  productName: string
  collectionSlug: string
  sku: string
  variant: string | null
  materialNote: string | null
  recordedWeight: string | null
  customerName: string
  purchaseDate: string
  firstVerified: string
  verificationCount: number
}

export async function lookupArticle(code: string): Promise<ArticleLookupResult | null> {
  try {
    return await request<ArticleLookupResult>(`/articles/${encodeURIComponent(code)}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// ── Public: promo validation (UI preview only — the server
// recomputes and applies the real discount when the order is placed) ──
export interface PromoPreview {
  valid: boolean
  description?: string
  discountType?: 'percent' | 'flat'
  discountValue?: number
}

export async function validatePromo(code: string): Promise<PromoPreview> {
  try {
    const row = await request<{ valid: true; description?: string; discount_type: 'percent' | 'flat'; discount_value: number }>(
      `/promos/validate/${encodeURIComponent(code)}`,
    )
    return { valid: true, description: row.description, discountType: row.discount_type, discountValue: row.discount_value }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { valid: false }
    throw err
  }
}

// ── Admin: auth ──────────────────────────────────────────────
export interface AdminSession {
  token: string
  admin: { id: string; name: string; email: string; role: string }
}

export async function adminLogin(email: string, password: string): Promise<AdminSession> {
  return request<AdminSession>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

// ── Admin: orders ────────────────────────────────────────────
export interface ApiOrder {
  id: string
  ref: string
  customer_name: string
  email: string
  phone: string
  street: string
  area: string | null
  city: string
  province: string
  postal_code: string | null
  subtotal_pkr: number
  testing_fees_pkr: number
  delivery_pkr: number
  discount_pkr: number
  total_pkr: number
  payment_method: 'cod' | 'bank-transfer'
  payment_status: 'unpaid' | 'pending-review' | 'verified'
  order_status: 'pending-confirmation' | 'awaiting-payment' | 'preparing' | 'quality-check' | 'ready-for-dispatch' | 'dispatched' | 'delivered'
  courier_name: string | null
  tracking_number: string | null
  created_at: string
}

export interface ApiOrderItem {
  id: string
  product_name: string
  collection_slug: string
  category: string
  size: string | null
  qty: number
  unit_price_pkr: number
  gemstone_testing: boolean
}

export async function adminGetOrders(
  token: string,
  filters: { status?: string; paymentStatus?: string; search?: string } = {},
): Promise<ApiOrder[]> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus)
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()
  return request<ApiOrder[]>(`/orders${qs ? `?${qs}` : ''}`, {}, token)
}

export async function adminGetOrder(token: string, ref: string): Promise<ApiOrder & { items: ApiOrderItem[] }> {
  return request(`/orders/${ref}`, {}, token)
}

export async function adminUpdateOrderStatus(
  token: string,
  id: string,
  body: { orderStatus: ApiOrder['order_status']; courierName?: string; trackingNumber?: string; trackingUrl?: string },
): Promise<ApiOrder> {
  return request<ApiOrder>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }, token)
}

export async function adminVerifyPayment(token: string, id: string): Promise<{ ok: true; articleCodes: string[] }> {
  return request(`/orders/${id}/verify-payment`, { method: 'POST' }, token)
}

// ── Admin: enquiries ─────────────────────────────────────────
export interface ApiEnquiry {
  id: string
  ref: string
  type: 'customize' | 'new-design'
  status: 'new' | 'contacted' | 'quoted' | 'accepted' | 'declined'
  name: string
  phone: string
  email: string | null
  product_name: string | null
  product_sku: string | null
  jewellery_type: string | null
  purity_preference: string | null
  budget_range: string | null
  size_notes: string | null
  instructions: string | null
  created_at: string
}

export async function adminGetEnquiries(
  token: string,
  filters: { status?: string; search?: string } = {},
): Promise<ApiEnquiry[]> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()
  return request<ApiEnquiry[]>(`/enquiries${qs ? `?${qs}` : ''}`, {}, token)
}

export async function adminGetEnquiry(token: string, ref: string) {
  return request<ApiEnquiry & { files: { id: string; url: string; filename: string }[] }>(`/enquiries/${ref}`, {}, token)
}

export async function adminUpdateEnquiryStatus(
  token: string,
  id: string,
  body: { status: ApiEnquiry['status']; quotedPricePkr?: number },
): Promise<ApiEnquiry> {
  return request<ApiEnquiry>(`/enquiries/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }, token)
}
