import { useState, type FormEvent } from 'react'
import PageBanner from '../components/PageBanner'
import ProductImage from '../components/ProductImage'
import { trackOrder, ApiError } from '../lib/api'

const ORDER_STATUS_LABELS: Record<string, string> = {
  'pending-confirmation': 'Pending confirmation',
  'awaiting-payment': 'Awaiting payment',
  preparing: 'Preparing',
  'quality-check': 'Quality check',
  'ready-for-dispatch': 'Ready for dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  'pending-review': 'Pending review',
  verified: 'Verified',
}

type TrackResult = Awaited<ReturnType<typeof trackOrder>>

export default function TrackOrder() {
  const [ref, setRef] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<TrackResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const order = await trackOrder(ref.trim(), phone.trim())
      setResult(order)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not check that order right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageBanner
        eyebrow="Your SULTANÉ"
        title="Track your order."
        description="Enter the order reference and the phone number used at checkout to check its latest status."
        image={<ProductImage category="Chains" collection="middle-eastern" className="w-full h-full" iconClassName="w-16 h-16" />}
      />
      <div className="mx-auto max-w-[600px] px-6 sm:px-10 py-16">
        <form onSubmit={handleSubmit} className="space-y-3 mb-8">
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="SLT-2026-000123"
            required
            className="w-full border border-line bg-cream px-4 py-3 text-sm font-mono focus:outline-none focus:border-maroon"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 0000000"
            required
            className="w-full border border-line bg-cream px-4 py-3 text-sm focus:outline-none focus:border-maroon"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-3.5 hover:bg-maroon-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Check status'}
          </button>
        </form>

        {error && (
          <div className="bg-cream-dark p-6">
            <p className="text-sm text-stone leading-relaxed">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-cream-dark p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone">Order status</span>
              <span className="text-ink font-medium">{ORDER_STATUS_LABELS[result.order_status] ?? result.order_status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone">Payment</span>
              <span className="text-ink">
                {result.payment_method === 'cod' ? 'Cash on delivery' : 'Bank transfer'} · {PAYMENT_STATUS_LABELS[result.payment_status] ?? result.payment_status}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone">Courier</span>
              <span className="text-ink">{result.courier_name ?? 'Not yet assigned'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone">Tracking number</span>
              <span className="text-ink">{result.tracking_number ?? 'Not yet available'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone">Placed on</span>
              <span className="text-ink">{new Date(result.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
