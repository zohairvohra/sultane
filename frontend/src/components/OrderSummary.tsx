import { useState, type ReactNode } from 'react'
import { formatPKR } from '../lib/format'
import type { Quote } from '../lib/api'
import { useSettings } from '../context/SettingsContext'

interface Props {
  quote: Quote | null
  loading?: boolean
  itemCount: number
  promoCode: string
  onPromoChange: (code: string) => void
  children?: ReactNode
}

export default function OrderSummary({ quote, loading, itemCount, promoCode, onPromoChange, children }: Props) {
  const { settings } = useSettings()
  const [input, setInput] = useState(promoCode)

  const deliveryLabel =
    quote?.delivery == null
      ? settings.delivery_fee_karachi_pkr === 0
        ? `Free in Karachi · ${formatPKR(settings.delivery_fee_other_pkr)} elsewhere`
        : 'Calculated at checkout'
      : quote.delivery === 0
        ? 'Free'
        : formatPKR(quote.delivery)

  return (
    <div className={`bg-cream-dark p-6 sm:p-8 h-fit transition-opacity ${loading ? 'opacity-70' : ''}`}>
      <h2 className="font-display text-3xl text-noir mb-6">Order summary</h2>

      {/* Not a <form>: this summary is rendered inside the checkout form. */}
      <div className="flex gap-2">

        <label className="sr-only" htmlFor="promo">Enter a code</label>
        <input
          id="promo"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onPromoChange(input.trim().toUpperCase())
            }
          }}
          placeholder="Enter a code"
          className="field flex-1 uppercase"
          autoComplete="off"
        />
        {promoCode ? (
          <button
            type="button"
            onClick={() => {
              setInput('')
              onPromoChange('')
            }}
            className="border border-line text-[11px] uppercase tracking-[0.14em] px-4"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPromoChange(input.trim().toUpperCase())}
            className="border border-noir text-noir text-[11px] uppercase tracking-[0.14em] px-4 hover:bg-noir hover:text-cream transition-colors"
          >
            Apply
          </button>
        )}
      </div>
      {quote?.promo && (
        <p className={`text-xs mt-2 ${quote.promo.applied ? 'text-success' : 'text-danger'}`}>
          {quote.promo.applied ? `${quote.promo.code} applied — ${quote.promo.message}` : quote.promo.message}
        </p>
      )}

      <dl className="space-y-3 text-sm border-t border-line pt-5 mt-6">
        <div className="flex justify-between">
          <dt className="text-stone">Subtotal · {itemCount} {itemCount === 1 ? 'piece' : 'pieces'}</dt>
          <dd>{quote ? formatPKR(quote.subtotal) : '—'}</dd>
        </div>
        {!!quote?.testingFees && (
          <div className="flex justify-between">
            <dt className="text-stone">Gemstone testing</dt>
            <dd>{formatPKR(quote.testingFees)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-stone">Delivery</dt>
          <dd className="text-right">{deliveryLabel}</dd>
        </div>
        {!!quote?.discount && (
          <div className="flex justify-between text-success">
            <dt>Discount</dt>
            <dd>– {formatPKR(quote.discount)}</dd>
          </div>
        )}
      </dl>

      <div className="flex justify-between items-baseline border-t border-line mt-5 pt-5 mb-6">
        <span className="font-display text-2xl">Total</span>
        <span className="font-display text-2xl">{quote ? formatPKR(quote.total) : '—'}</span>
      </div>
      {quote?.delivery == null && <p className="text-xs text-stone -mt-4 mb-6">Delivery is added at checkout once you enter your city.</p>}

      {children}
    </div>
  )
}
