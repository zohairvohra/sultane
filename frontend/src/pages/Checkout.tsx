import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import OrderSummary from '../components/OrderSummary'
import ProductImage from '../components/ProductImage'
import { formatPKR } from '../lib/format'
import { CITIES } from '../lib/delivery'
import { createOrder, ApiError } from '../lib/api'
import type { OrderDraft } from '../data/types'

export default function Checkout() {
  const { lines, subtotal, testingFees, clearCart } = useCart()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState<string>(CITIES[1])
  const [province, setProvince] = useState('Punjab')
  const [postalCode, setPostalCode] = useState('')
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState<'cod' | 'bank-transfer'>('cod')
  const [agree, setAgree] = useState(false)
  const [totals, setTotals] = useState<{ delivery: number; discount: number; total: number; promoCode?: string }>({
    delivery: 0,
    discount: 0,
    total: subtotal + testingFees,
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (lines.length === 0 && !submitted) return <Navigate to="/shop" replace />

  const canSubmit = email && phone && firstName && lastName && street && city && province && agree

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await createOrder({
        customer: { firstName, lastName, email, phone, street, area: area || undefined, city, province, postalCode: postalCode || undefined, notes: notes || undefined },
        items: lines.map((l) => ({ productId: l.product.id, size: l.size, qty: l.qty, gemstoneTesting: l.gemstoneTesting })),
        paymentMethod: payment,
        promoCode: totals.promoCode,
      })

      const order: OrderDraft = {
        ref: result.ref,
        placedAt: new Date().toISOString(),
        customer: { firstName, lastName, email, phone, street, area, city, province, postalCode, notes },
        lines: lines.map((l) => ({
          name: l.product.name,
          collection: l.product.collection,
          category: l.product.category,
          size: l.size,
          qty: l.qty,
          price: l.product.price,
          gemstoneTesting: l.gemstoneTesting,
        })),
        subtotal: result.subtotal,
        testingFees: result.testingFees,
        delivery: result.delivery,
        discount: result.discount,
        total: result.total,
        paymentMethod: payment,
      }

      setSubmitted(true)
      clearCart()
      navigate('/order-confirmation', { state: { order } })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not place your order. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-10">
      <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">Bag → Checkout → Confirmation</div>
      <h1 className="font-display text-5xl text-maroon mb-3">Make it yours.</h1>
      <p className="text-stone mb-10">Guest checkout · No account required. Review the details before placing your order.</p>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_380px] gap-12">
        <div>
          <section className="mb-10">
            <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">01 / Contact</div>
            <h2 className="font-display text-3xl text-maroon mb-5">Where can we reach you?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Email address *">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amina@example.com" className={inputCls} />
              </Field>
              <Field label="Mobile / WhatsApp number *">
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 0000000" className={inputCls} />
              </Field>
            </div>
            <p className="text-xs text-stone mt-2">For order updates only. Marketing consent is separate and optional.</p>
          </section>

          <section className="mb-10 border-t border-line pt-8">
            <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">02 / Delivery address</div>
            <h2 className="font-display text-3xl text-maroon mb-5">A place to arrive.</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <Field label="First name *">
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Last name *">
                <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Street address *" className="mb-4">
              <input required value={street} onChange={(e) => setStreet(e.target.value)} placeholder="House 12, Sample Lane" className={inputCls} />
            </Field>
            <Field label="Area / apartment / landmark (optional)" className="mb-4">
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Gulberg III" className={inputCls} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <Field label="City *">
                <select required value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Province / territory *">
                <input required value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Postal code (optional)">
                <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Delivery notes (optional)">
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the courier should know?" className={inputCls} />
              </Field>
            </div>
          </section>

          <section className="border-t border-line pt-8">
            <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">03 / Payment</div>
            <h2 className="font-display text-3xl text-maroon mb-5">Choose how to pay.</h2>

            <label className={`block border p-5 mb-4 cursor-pointer ${payment === 'cod' ? 'border-maroon bg-cream-dark' : 'border-line'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" checked={payment === 'cod'} onChange={() => setPayment('cod')} className="accent-maroon" />
                <span className="font-medium text-ink">Cash on delivery (COD)</span>
              </div>
              <p className="text-xs text-stone mt-2 ml-6">
                {formatPKR(totals.total)} payable on delivery. The team will contact you to confirm the order before dispatch.
              </p>
            </label>

            <label className={`block border p-5 mb-4 cursor-pointer ${payment === 'bank-transfer' ? 'border-maroon bg-cream-dark' : 'border-line'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" checked={payment === 'bank-transfer'} onChange={() => setPayment('bank-transfer')} className="accent-maroon" />
                <span className="font-medium text-ink">Bank transfer</span>
              </div>
              <p className="text-xs text-stone mt-2 ml-6">
                Instructions are shared after the request is placed. Payment remains pending until manually confirmed
                by the team — production starts only after verification.
              </p>
            </label>

            <p className="text-xs text-stone mb-6">Online card and wallet payments are future scope, not launch payment options.</p>

            <label className="flex items-start gap-2.5 text-sm mb-3 cursor-pointer">
              <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-maroon" />
              I have reviewed the delivery and returns information and agree to the order terms and privacy notice. *
            </label>
            <label className="flex items-start gap-2.5 text-sm mb-8 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-maroon" />
              Email me occasional collection stories and news. (Optional)
            </label>

            {submitError && <p className="text-sm text-maroon mb-3">{submitError}</p>}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-4 hover:bg-maroon-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Placing your order…'
                : payment === 'cod'
                ? `Place COD order · ${formatPKR(totals.total)} due on delivery`
                : `Place bank transfer order · ${formatPKR(totals.total)}`}
            </button>
            <p className="text-xs text-stone mt-3">
              Submitting places an order request, not a payment. Production begins only once your payment is
              confirmed by our team.
            </p>
          </section>
        </div>

        <div>
          <div className="bg-cream-dark p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl text-maroon">Your selection</h2>
              <Link to="/cart" className="text-xs text-maroon underline underline-offset-2">Edit bag</Link>
            </div>
            <div className="space-y-4">
              {lines.map((l) => (
                <div key={l.lineId} className="flex gap-4">
                  <ProductImage category={l.product.category} collection={l.product.collection} className="w-16 h-16 shrink-0" iconClassName="w-7 h-7" />
                  <div className="flex-1">
                    <div className="font-display text-lg text-ink leading-tight">{l.product.name}</div>
                    <div className="text-xs text-stone">
                      {l.product.collection} · {l.size ? `Size ${l.size} / ` : ''}silver tone · Qty {l.qty}
                    </div>
                    <div className="text-sm text-ink mt-1">{formatPKR(l.product.price * l.qty)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <OrderSummary
            title="Order total"
            subtotal={subtotal}
            testingFees={testingFees}
            itemCount={lines.reduce((s, l) => s + l.qty, 0)}
            city={city}
            onCityChange={setCity}
            citySelectable={false}
            onTotalsChange={setTotals}
            cta={<div />}
            footnote={
              payment === 'cod' ? (
                <span className="block bg-blush text-maroon text-xs px-3 py-2">
                  COD · {formatPKR(totals.total)} due on delivery
                </span>
              ) : (
                <span className="block bg-blush text-maroon text-xs px-3 py-2">
                  Bank transfer · pending manual verification
                </span>
              )
            }
          />
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'w-full border border-line bg-cream px-4 py-3 text-sm focus:outline-none focus:border-maroon'

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs text-stone mb-1.5">{label}</label>
      {children}
    </div>
  )
}
