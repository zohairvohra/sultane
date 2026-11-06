import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useCustomer } from '../context/CustomerContext'
import OrderSummary from '../components/OrderSummary'
import ProductImage from '../components/ProductImage'
import Field from '../components/Field'
import { Button } from '../components/Button'
import { formatPKR, MAJOR_CITIES, PROVINCES } from '../lib/format'
import { placeOrder, ApiError } from '../lib/api'
import { useQuote } from '../lib/useQuote'

export default function Checkout() {
  const { lines, count, payload, promoCode, setPromoCode, clearCart } = useCart()
  const { customer, token } = useCustomer()
  const navigate = useNavigate()

  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer ? `0${customer.phone.slice(2)}` : '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [notes, setNotes] = useState('')
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { quote, error: quoteError, loading } = useQuote(payload, { city, promoCode, phone })

  if (lines.length === 0 && !submitting) return <Navigate to="/cart" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!agree) {
      setError('Please confirm you have read the delivery and returns policy.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const order = await placeOrder(
        {
          customer: { name, phone, email: email || undefined, street, area: area || undefined, city, province: province || undefined, notes: notes || undefined },
          items: payload,
          promoCode: promoCode || undefined,
          acceptPolicies: true,
        },
        token,
      )
      clearCart()
      navigate(`/order/${order.ref}`, { state: { order, phone }, replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place your order. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-12">
      <div className="eyebrow text-stone mb-3">Bag → Checkout → Bank transfer</div>
      <h1 className="font-display text-5xl text-noir mb-3">Checkout</h1>
      {!customer && (
        <p className="text-sm text-stone mb-10">
          Checking out as a guest. <Link to="/account?next=/checkout" className="underline underline-offset-2 text-noir">Sign in</Link> to save this order to an account (optional).
        </p>
      )}
      {customer && <p className="text-sm text-stone mb-10">Signed in as {customer.name}. This order will appear in your account.</p>}

      <form onSubmit={submit} className="grid lg:grid-cols-[1fr_420px] gap-12">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-3xl mb-5">Your details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name *" className="sm:col-span-2">
                <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" autoComplete="name" />
              </Field>
              <Field label="Phone / WhatsApp number *" hint="We send order updates on WhatsApp.">
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 1234567" className="field" autoComplete="tel" />
              </Field>
              <Field label="Email (optional)">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="email" />
              </Field>
            </div>
          </section>

          <section className="border-t border-line pt-10">
            <h2 className="font-display text-3xl mb-5">Delivery address</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="House / street address *" className="sm:col-span-2">
                <input required minLength={3} value={street} onChange={(e) => setStreet(e.target.value)} className="field" autoComplete="address-line1" />
              </Field>
              <Field label="Area / landmark (optional)" className="sm:col-span-2">
                <input value={area} onChange={(e) => setArea(e.target.value)} className="field" autoComplete="address-line2" />
              </Field>
              <Field label="City *" hint={city ? (city.trim().toLowerCase() === 'karachi' ? 'Free delivery within Karachi.' : 'Delivery charge shown in your order summary.') : undefined}>
                <input required list="cities" value={city} onChange={(e) => setCity(e.target.value)} className="field" autoComplete="address-level2" />
                <datalist id="cities">
                  {MAJOR_CITIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Province">
                <select value={province} onChange={(e) => setProvince(e.target.value)} className="field">
                  <option value="">Select</option>
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Delivery instructions (optional)" className="sm:col-span-2">
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="field" />
              </Field>
            </div>
          </section>

          <section className="border-t border-line pt-10">
            <h2 className="font-display text-3xl mb-5">Payment</h2>
            <div className="border border-noir p-5 flex gap-4">
              <Landmark size={22} strokeWidth={1.3} className="text-rose shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium mb-1">Bank transfer</div>
                <p className="text-stone leading-relaxed">
                  After you submit, we show our bank details and the exact amount to transfer. Upload your receipt on the order page
                  (or send it on WhatsApp). Our team verifies every payment by hand — production only starts once it's verified.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm mt-6 cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-noir w-4 h-4" />
              <span>
                I understand every piece is made to order and that there are no change-of-mind returns. I have read the{' '}
                <Link to="/policies/delivery" target="_blank" className="underline underline-offset-2">delivery</Link>,{' '}
                <Link to="/policies/returns" target="_blank" className="underline underline-offset-2">returns &amp; defects</Link> and{' '}
                <Link to="/policies/privacy" target="_blank" className="underline underline-offset-2">privacy</Link> policies. *
              </span>
            </label>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-cream-dark p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl">Your pieces</h2>
              <Link to="/cart" className="text-xs underline underline-offset-2">Edit bag</Link>
            </div>
            <ul className="space-y-4">
              {lines.map((l) => (
                <li key={l.lineId} className="flex gap-4">
                  <ProductImage src={l.product.images[0]?.url} alt={l.product.name} category={l.product.category} className="w-16 h-16 shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="font-display text-lg leading-tight">{l.product.name}</div>
                    <div className="text-xs text-stone">
                      Qty {l.qty}{l.size ? ` · Size ${l.size}` : ''}{l.gemstoneTesting ? ' · Gemstone testing' : ''}
                    </div>
                  </div>
                  <div className="text-sm">{formatPKR(l.product.price * l.qty)}</div>
                </li>
              ))}
            </ul>
          </div>

          <OrderSummary quote={quote} loading={loading} itemCount={count} promoCode={promoCode} onPromoChange={setPromoCode}>
            {(error || quoteError) && <p className="text-sm text-danger mb-4">{error || quoteError}</p>}
            <Button type="submit" disabled={submitting || !!quoteError || !quote || (!!promoCode && !quote.promo?.applied)} className="w-full !py-4">
              {submitting ? 'Placing order…' : `Place order${quote?.delivery != null ? ` · ${formatPKR(quote.total)}` : ''}`}
            </Button>
            {!!promoCode && quote?.promo && !quote.promo.applied && <p className="text-xs text-stone mt-2">Remove the code to continue.</p>}
            <p className="text-xs text-stone mt-4">Placing your order does not take payment. You will receive bank-transfer instructions next.</p>
          </OrderSummary>
        </div>
      </form>
    </div>
  )
}
