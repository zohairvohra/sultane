import { Check } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import ProductImage from '../components/ProductImage'
import { LinkButton } from '../components/Button'
import { formatPKR } from '../lib/format'
import type { OrderDraft } from '../data/types'

export default function OrderConfirmation() {
  const { state } = useLocation() as { state: { order?: OrderDraft } | null }
  const order = state?.order

  if (!order) return <Navigate to="/" replace />

  const placedDate = new Date(order.placedAt)
  const dateLabel = placedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = placedDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  const isCod = order.paymentMethod === 'cod'

  return (
    <div>
      <div className="bg-blush">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 sm:py-20">
          <Check size={28} strokeWidth={1.5} className="text-maroon mb-5" />
          <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-4">
            Your order request is received
          </div>
          <h1 className="font-display text-5xl sm:text-6xl text-maroon mb-5">Thank you, {order.customer.firstName}.</h1>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="font-display text-xl text-ink">{order.ref}</span>
            <span className="bg-cream text-xs px-3 py-1.5 text-ink">Pending confirmation</span>
            <span className="text-xs text-stone">{isCod ? 'COD · Unpaid' : 'Bank transfer · Unpaid'}</span>
          </div>
          <p className="text-stone max-w-xl leading-relaxed mb-3">
            We&rsquo;ll contact you to confirm availability and delivery details. No payment has been collected, and
            this order has not been dispatched.
          </p>
          <p className="text-xs text-stone">Order placed {dateLabel} · {timeLabel}</p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 sm:py-20 grid lg:grid-cols-[1fr_380px] gap-12">
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl text-maroon">From our desk to your door.</h2>
            <span className="text-xs text-stone hidden sm:inline">Current stage: awaiting team confirmation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
            {[
              { n: '01', label: 'Request received', status: `${dateLabel} · ${timeLabel}`, active: true },
              { n: '02', label: 'Team confirmation', status: 'Pending', active: false },
              { n: '03', label: 'Preparing your order', status: 'Not started', active: false },
              { n: '04', label: 'Dispatched / delivered', status: 'Not started', active: false },
            ].map((step) => (
              <div key={step.n} className={`border-t-2 pt-4 ${step.active ? 'border-maroon' : 'border-line'}`}>
                <div className="font-display text-2xl text-maroon mb-1">{step.n}</div>
                <div className="text-sm text-ink mb-1">{step.label}</div>
                <div className="text-xs text-stone">{step.status}</div>
              </div>
            ))}
          </div>

          <div className="space-y-5 border-t border-line pt-6 mb-8">
            {order.lines.map((line, i) => (
              <div key={i} className="flex gap-4">
                <ProductImage category={line.category} collection={line.collection} className="w-20 h-20 shrink-0" iconClassName="w-8 h-8" />
                <div>
                  <div className="font-display text-xl text-ink">{line.name}</div>
                  <div className="text-xs text-stone">
                    {line.collection} · {line.size ? `Size ${line.size} / ` : ''}silver tone · Qty {line.qty}
                  </div>
                  <div className="text-sm text-ink mt-1">{formatPKR(line.price * line.qty)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-stone mb-2">Delivery address</div>
              <p className="text-sm text-ink leading-relaxed">
                {order.customer.firstName} {order.customer.lastName}
                <br />
                {order.customer.street}{order.customer.area ? `, ${order.customer.area}` : ''}
                <br />
                {order.customer.city}, {order.customer.province}
                {order.customer.postalCode ? ` ${order.customer.postalCode}` : ''}, Pakistan
                <br />
                {order.customer.phone}
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-stone mb-2">Contact &amp; courier</div>
              <p className="text-sm text-ink leading-relaxed">
                {order.customer.email}
                <br />
                Courier: not assigned
                <br />
                Tracking number: not yet available
                <br />
                Delivery date: to be confirmed
              </p>
            </div>
          </div>

          <div className="bg-cream-dark p-5 mb-8">
            <div className="text-sm font-medium text-ink mb-1">Keep your reference close</div>
            <p className="text-xs text-stone leading-relaxed">
              Use {order.ref} when contacting support. The team will share delivery updates once a courier and
              tracking number are assigned.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <LinkButton to="/shop" variant="outline" className="w-fit">Continue exploring</LinkButton>
            <LinkButton to="/care" variant="outline" className="w-fit">Contact support</LinkButton>
          </div>
        </div>

        <div className="bg-cream-dark p-6 sm:p-8 h-fit">
          <h2 className="font-display text-2xl text-maroon mb-6">
            {isCod ? 'Payment due on delivery.' : 'Payment pending verification.'}
          </h2>
          <div className="space-y-3 text-sm mb-5">
            <div className="flex justify-between"><span className="text-stone">Subtotal</span><span>{formatPKR(order.subtotal)}</span></div>
            {order.testingFees > 0 && (
              <div className="flex justify-between"><span className="text-stone">Gemstone testing</span><span>{formatPKR(order.testingFees)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-stone">Delivery</span><span>{order.delivery === 0 ? 'Free' : formatPKR(order.delivery)}</span></div>
            <div className="flex justify-between"><span className="text-stone">Discount</span><span>{order.discount > 0 ? `– ${formatPKR(order.discount)}` : formatPKR(0)}</span></div>
          </div>
          <div className="flex justify-between items-baseline border-t border-line pt-5 mb-5">
            <span className="font-display text-2xl text-ink">Total</span>
            <span className="font-display text-2xl text-maroon">{formatPKR(order.total)}</span>
          </div>
          <div className="bg-blush text-maroon text-xs px-3 py-2 mb-5">
            {isCod ? `COD · ${formatPKR(order.total)} due on delivery` : 'Bank transfer · awaiting instructions'}
          </div>
          <div className="text-sm space-y-1 border-t border-line pt-5">
            <div className="flex justify-between"><span className="text-stone">Payment method</span><span>{isCod ? 'Cash on delivery' : 'Bank transfer'}</span></div>
            <div className="flex justify-between"><span className="text-stone">Paid</span><span>PKR 0</span></div>
            <div className="flex justify-between"><span className="text-stone">Balance due</span><span>{formatPKR(order.total)}</span></div>
          </div>
          <p className="text-xs text-stone mt-5">
            This page acknowledges a request only. It is not proof of payment or shipment.
            {!isCod && ' Bank transfer instructions will follow via WhatsApp or email.'}
          </p>
        </div>
      </div>
    </div>
  )
}
