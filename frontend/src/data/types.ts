export type Category = 'Necklaces' | 'Earrings' | 'Bracelets' | 'Rings' | 'Chains' | 'Pendants'
export const CATEGORIES: Category[] = ['Necklaces', 'Earrings', 'Bracelets', 'Rings', 'Chains', 'Pendants']

export interface Collection {
  slug: string
  name: string
  tagline: string
  description: string
  imageUrl: string | null
  position: number
  productCount: number
}

export interface ProductImage {
  id: string
  url: string
  position: number
}

export type ProductStatus = 'active' | 'paused' | 'draft'

export interface Product {
  id: string
  sku: string
  slug: string
  name: string
  category: Category
  price: number
  description: string
  sizes: string[]
  status: ProductStatus
  productionTime: string
  isBestseller: boolean
  isPremium: boolean
  isMens: boolean
  allowCustomisation: boolean
  purity925: boolean
  materialNote: string | null
  gemstone: { type: string; origin: 'natural' | 'lab-created' | null; details: string | null } | null
  testingAvailable: boolean
  certificationInfo: string | null
  position: number
  collections: string[]
  images: ProductImage[]
}

export interface BankDetails {
  bankName: string
  accountTitle: string
  accountNumber: string
  iban: string
}

export interface Faq {
  q: string
  a: string
}

export interface SiteSettings {
  whatsapp_number: string
  delivery_fee_karachi_pkr: number
  delivery_fee_other_pkr: number
  gemstone_testing_fee_pkr: number
  bank_details: BankDetails
  hero_video_url: string
  hero_poster_url: string
  loyalty_percent: number
  loyalty_valid_days: number
  announcement: string
  about_story: string
  faqs: Faq[]
  policy_delivery: string
  policy_returns: string
  policy_privacy: string
  policy_terms: string
}

export type OrderStatus =
  | 'pending-price'
  | 'awaiting-payment'
  | 'payment-verified'
  | 'in-production'
  | 'quality-check'
  | 'ready-for-dispatch'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'awaiting' | 'proof-submitted' | 'verified' | 'flagged'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  'pending-price': 'Pending Price',
  'awaiting-payment': 'Awaiting Payment',
  'payment-verified': 'Payment Verified',
  'in-production': 'Preparing / In Production',
  'quality-check': 'Quality Check',
  'ready-for-dispatch': 'Ready for Dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_FLOW: OrderStatus[] = [
  'awaiting-payment',
  'payment-verified',
  'in-production',
  'quality-check',
  'ready-for-dispatch',
  'dispatched',
  'delivered',
]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  awaiting: 'Awaiting payment',
  'proof-submitted': 'Receipt received — awaiting verification',
  verified: 'Payment verified',
  flagged: 'Payment needs review',
}

// What a customer sees about their own order
export interface CustomerOrder {
  ref: string
  createdAt: string
  customerName: string
  phone: string
  address: { street: string; area: string | null; city: string; province: string | null }
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  paymentNote: string | null
  proofUploadedAt: string | null
  subtotal: number
  testingFees: number
  delivery: number
  discount: number
  total: number
  promoCode: string | null
  courier: { name: string; trackingNumber: string | null; trackingUrl: string | null; dispatchDate: string | null } | null
  deliveredAt: string | null
  items: {
    id: string
    name: string
    sku: string | null
    size: string | null
    qty: number
    unitPrice: number
    gemstoneTesting: boolean
    testingFee: number
    isCustom: boolean
    customDetails: string | null
  }[]
  articles: { code: string; itemId: string; pieceIndex: number; productName: string }[]
  bankDetails: BankDetails | null
}
