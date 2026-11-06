import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../data/types'
import type { CartItemPayload } from '../lib/api'

// The bag persists in this browser so a refresh never empties it. It holds
// display snapshots only — the server re-prices every item at checkout.
// Customisation requests are never cart items: they go through enquiries.
export interface CartLine {
  lineId: string
  product: Pick<Product, 'id' | 'slug' | 'name' | 'sku' | 'price' | 'category' | 'images' | 'productionTime' | 'testingAvailable' | 'isPremium'>
  size?: string
  qty: number
  gemstoneTesting: boolean
}

interface CartContextValue {
  lines: CartLine[]
  addToCart: (product: Product, size: string | undefined, qty: number, gemstoneTesting: boolean) => void
  updateQty: (lineId: string, qty: number) => void
  setTesting: (lineId: string, on: boolean) => void
  removeLine: (lineId: string) => void
  clearCart: () => void
  count: number
  payload: CartItemPayload[]
  promoCode: string
  setPromoCode: (code: string) => void
}

const STORAGE_KEY = 'sultane_bag_v2'
export const MAX_QTY = 20
const CartContext = createContext<CartContextValue | null>(null)

function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored)
  const [promoCode, setPromoCode] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* storage unavailable — bag still works for this visit */
    }
  }, [lines])

  const addToCart = (product: Product, size: string | undefined, qty: number, gemstoneTesting: boolean) => {
    const snapshot: CartLine['product'] = {
      id: product.id, slug: product.slug, name: product.name, sku: product.sku, price: product.price,
      category: product.category, images: product.images.slice(0, 1), productionTime: product.productionTime,
      testingAvailable: product.testingAvailable, isPremium: product.isPremium,
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id && l.size === size && l.gemstoneTesting === gemstoneTesting)
      if (existing) return prev.map((l) => (l === existing ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
      return [...prev, { lineId: `${product.id}-${size ?? 'na'}-${Date.now()}`, product: snapshot, size, qty, gemstoneTesting }]
    })
  }

  const updateQty = (lineId: string, qty: number) =>
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)))
  const setTesting = (lineId: string, on: boolean) =>
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, gemstoneTesting: on } : l)))
  const removeLine = (lineId: string) => setLines((prev) => prev.filter((l) => l.lineId !== lineId))
  const clearCart = () => {
    setLines([])
    setPromoCode('')
  }

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines])
  const payload = useMemo(
    () => lines.map((l) => ({ productId: l.product.id, size: l.size, qty: l.qty, gemstoneTesting: l.gemstoneTesting })),
    [lines],
  )

  return (
    <CartContext.Provider value={{ lines, addToCart, updateQty, setTesting, removeLine, clearCart, count, payload, promoCode, setPromoCode }}>
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
