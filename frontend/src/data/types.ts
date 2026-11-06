export type CollectionSlug = 'italia' | 'bharat' | 'turkish' | 'middle-eastern' | 'moroccan'

export type Category = 'Rings' | 'Earrings' | 'Pendants' | 'Bracelets' | 'Chains' | 'Necklaces'

export interface Collection {
  slug: CollectionSlug
  name: string
  tagline: string
  description: string
}

export interface OrderLineSnapshot {
  name: string
  collection: CollectionSlug
  category: Category
  size?: string
  qty: number
  price: number
  gemstoneTesting?: boolean
}

export interface OrderDraft {
  ref: string
  placedAt: string
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
  lines: OrderLineSnapshot[]
  subtotal: number
  testingFees: number
  delivery: number
  discount: number
  total: number
  paymentMethod: 'cod' | 'bank-transfer'
}

export interface EnquiryDraft {
  ref: string
  type: 'customize' | 'new-design'
  submittedAt: string
  name: string
  phone: string
  email?: string
  productName?: string
  productSku?: string
  jewelleryType?: string
  purityPreference?: string
  budget?: string
  sizeNotes?: string
  instructions: string
  fileNames: string[]
}

export interface Product {
  id: string
  sku: string
  slug: string
  name: string
  collection: CollectionSlug
  category: Category
  price: number
  description: string
  sizes?: string[]
  availability: 'available' | 'enquire'
  productionDays: string
  isBestseller?: boolean
  isPremium?: boolean
  hasGemstone?: boolean
  purity925?: boolean
}
