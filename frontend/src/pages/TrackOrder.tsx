import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageBanner from '../components/PageBanner'
import OrderView from '../components/OrderView'
import Field from '../components/Field'
import { Button } from '../components/Button'
import { lookupOrder, ApiError } from '../lib/api'
import type { CustomerOrder } from '../data/types'

// Secure tracking: an order is only shown when BOTH the order number and the
// phone number on the order match — a reference alone reveals nothing.
export default function TrackOrder() {
  const [params] = useSearchParams()
  const [ref, setRef] = useState(params.get('ref') ?? '')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      setOrder(await lookupOrder(ref.trim(), phone.trim()))
    } catch (err) {
      setOrder(null)
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageBanner eyebrow="Your order" title="Track your order" description="Enter your order number and the phone number you used at checkout." tone="silver" />
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-12">
        {!order ? (
          <form onSubmit={submit} className="max-w-md mx-auto space-y-4">
            <Field label="Order number">
              <input required value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="SLT-2026-123456" className="field uppercase" />
            </Field>
            <Field label="Phone number">
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 1234567" className="field" autoComplete="tel" />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Looking up…' : 'Find my order'}</Button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-3xl">Order {order.ref}</h2>
              <button onClick={() => setOrder(null)} className="text-xs uppercase tracking-[0.14em] text-stone hover:text-noir">Look up another</button>
            </div>
            <OrderView order={order} phone={phone} onChange={setOrder} />
          </>
        )}
      </div>
    </div>
  )
}
