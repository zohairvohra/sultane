import { useEffect, useState } from 'react'
import { getQuote, ApiError, type CartItemPayload, type Quote } from './api'

// Live server-side quote. Every total on screen comes from the server, so
// what the customer sees is exactly what the order will record.
export function useQuote(items: CartItemPayload[], opts: { city?: string; promoCode?: string; phone?: string }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const key = JSON.stringify({ items, ...opts })

  useEffect(() => {
    if (!items.length) {
      setQuote(null)
      return
    }
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      getQuote({ items, city: opts.city || undefined, promoCode: opts.promoCode || undefined, phone: opts.phone || undefined })
        .then((q) => {
          if (!alive) return
          setQuote(q)
          setError('')
        })
        .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Could not calculate your total'))
        .finally(() => alive && setLoading(false))
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { quote, error, loading }
}
