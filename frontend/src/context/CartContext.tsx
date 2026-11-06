import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../data/types'

export const GEMSTONE_TESTING_FEE = 799

export interface CartLine {
  lineId: string
  product: Product
  size?: string
  qty: number
  gemstoneTesting?: boolean
}

interface CartContextValue {
  lines: CartLine[]
  addToCart: (product: Product, size: string | undefined, qty: number, gemstoneTesting?: boolean) => void
  updateQty: (lineId: string, qty: number) => void
  removeLine: (lineId: string) => void
  clearCart: () => void
  subtotal: number
  testingFees: number
  count: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])

  const addToCart = (product: Product, size: string | undefined, qty: number, gemstoneTesting?: boolean) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id && l.size === size && l.gemstoneTesting === gemstoneTesting)
      if (existing) {
        return prev.map((l) => (l.lineId === existing.lineId ? { ...l, qty: l.qty + qty } : l))
      }
      return [
        ...prev,
        { lineId: `${product.id}-${size ?? 'na'}-${Date.now()}`, product, size, qty, gemstoneTesting },
      ]
    })
  }

  const updateQty = (lineId: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, qty: Math.max(1, qty) } : l)))
  }

  const removeLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId))
  }

  const clearCart = () => setLines([])

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.product.price * l.qty, 0), [lines])
  const testingFees = useMemo(
    () => lines.reduce((sum, l) => sum + (l.gemstoneTesting ? GEMSTONE_TESTING_FEE * l.qty : 0), 0),
    [lines],
  )
  const count = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines])

  return (
    <CartContext.Provider
      value={{ lines, addToCart, updateQty, removeLine, clearCart, subtotal, testingFees, count }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
