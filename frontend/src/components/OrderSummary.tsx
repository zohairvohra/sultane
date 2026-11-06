import { useEffect, useState, type ReactNode } from 'react'
import { formatPKR } from '../lib/format'
import { CITIES, deliveryFeeFor } from '../lib/delivery'
import { validatePromo } from '../lib/api'

interface OrderSummaryProps {
  title: string
  subtotal: number
  testingFees: number
  itemCount: number
  city: string
  onCityChange: (city: string) => void
  footnote: ReactNode
  cta: ReactNode
  citySelectable?: boolean
  onTotalsChange?: (totals: { delivery: number; discount: number; total: number; promoCode?: string }) => void
}

export default function OrderSummary({
  title,
  subtotal,
  testingFees,
  itemCount,
  city,
  onCityChange,
  footnote,
  cta,
  citySelectable = true,
  onTotalsChange,
}: OrderSummaryProps) {
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ valid: boolean; amount: number; description?: string } | null>(null)
  const [checkingPromo, setCheckingPromo] = useState(false)

  const delivery = deliveryFeeFor(city)
  const discount = promo?.valid ? promo.amount : 0
  const total = Math.max(0, subtotal + testingFees + delivery - discount)

  useEffect(() => {
    onTotalsChange?.({ delivery, discount, total, promoCode: promo?.valid ? promoInput.trim().toUpperCase() : undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery, discount, total, promo])

  const applyPromo = async () => {
    if (!promoInput.trim()) return
    setCheckingPromo(true)
    try {
      const result = await validatePromo(promoInput)
      if (!result.valid) {
        setPromo({ valid: false, amount: 0 })
        return
      }
      const amount =
        result.discountType === 'percent' ? Math.round((subtotal * (result.discountValue ?? 0)) / 100) : result.discountValue ?? 0
      setPromo({ valid: true, amount, description: result.description })
    } catch {
      setPromo({ valid: false, amount: 0 })
    } finally {
      setCheckingPromo(false)
    }
  }

  return (
    <div className="bg-cream-dark p-6 sm:p-8 h-fit">
      <h2 className="font-display text-3xl text-maroon mb-6">{title}</h2>

      {citySelectable ? (
        <>
          <label className="block text-xs text-stone mb-2">Estimate delivery</label>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full border border-line bg-cream px-4 py-3 text-sm mb-3 focus:outline-none focus:border-maroon"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-xs text-stone mb-6">
            Sample Pakistan delivery estimate. Final charge is confirmed before your order is placed.
          </p>
        </>
      ) : (
        <div className="flex justify-between text-xs text-stone mb-6 pb-3 border-b border-line">
          <span>Delivering to</span>
          <span className="text-ink">{city || 'Add your address below'}</span>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <input
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          placeholder="Enter a code"
          className="flex-1 border border-line bg-cream px-3 py-2.5 text-sm focus:outline-none focus:border-maroon"
        />
        <button
          onClick={applyPromo}
          type="button"
          disabled={checkingPromo}
          className="border border-maroon text-maroon text-xs uppercase tracking-wide px-4 hover:bg-maroon hover:text-cream transition-colors disabled:opacity-50"
        >
          {checkingPromo ? '…' : 'Apply'}
        </button>
      </div>
      {promo && !promo.valid && <p className="text-xs text-maroon -mt-4 mb-6">Code not recognised.</p>}
      {promo?.valid && <p className="text-xs text-success -mt-4 mb-6">{promo.description} applied.</p>}

      <div className="space-y-3 text-sm border-t border-line pt-5">
        <div className="flex justify-between">
          <span className="text-stone">Subtotal · {itemCount} {itemCount === 1 ? 'piece' : 'pieces'}</span>
          <span>{formatPKR(subtotal)}</span>
        </div>
        {testingFees > 0 && (
          <div className="flex justify-between">
            <span className="text-stone">Gemstone testing</span>
            <span>{formatPKR(testingFees)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-stone">Delivery · {city.split(',')[0]} estimate</span>
          <span>{delivery === 0 ? 'Free' : formatPKR(delivery)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone">Discount</span>
          <span>{discount > 0 ? `– ${formatPKR(discount)}` : formatPKR(0)}</span>
        </div>
      </div>

      <div className="flex justify-between items-baseline border-t border-line mt-5 pt-5 mb-2">
        <span className="font-display text-2xl text-ink">Total</span>
        <span className="font-display text-2xl text-maroon">{formatPKR(Math.max(0, total))}</span>
      </div>
      <p className="text-xs text-stone mb-6">
        No additional tax line in this concept; tax treatment and delivery charges require confirmation before
        launch.
      </p>

      {cta}
      {footnote}
    </div>
  )
}
