import { Link } from 'react-router-dom'
import { Minus, Plus, X } from 'lucide-react'
import { useCart, MAX_QTY } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import ProductImage from '../components/ProductImage'
import OrderSummary from '../components/OrderSummary'
import { LinkButton } from '../components/Button'
import { formatPKR } from '../lib/format'
import { useQuote } from '../lib/useQuote'

export default function Cart() {
  const { lines, updateQty, removeLine, setTesting, count, payload, promoCode, setPromoCode } = useCart()
  const { settings } = useSettings()
  const { quote, error, loading } = useQuote(payload, { promoCode })

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-28 text-center">
        <h1 className="font-display text-5xl text-noir mb-4">Your bag is empty</h1>
        <p className="text-stone mb-8">Discover pieces made to order for you.</p>
        <LinkButton to="/shop">Shop jewellery</LinkButton>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-12">
      <h1 className="font-display text-5xl text-noir mb-2">Your bag</h1>
      <p className="text-stone mb-10 text-sm">Standard designs at their listed prices. Customisation requests are quoted separately on WhatsApp.</p>

      <div className="grid lg:grid-cols-[1fr_400px] gap-12">
        <div>
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((l) => {
              const eligible = l.product.isPremium && l.product.testingAvailable
              return (
                <li key={l.lineId} className="py-6 flex gap-4 sm:gap-6">
                  <Link to={`/product/${l.product.slug}`} className="shrink-0">
                    <ProductImage src={l.product.images[0]?.url} alt={l.product.name} category={l.product.category} className="w-24 h-28 sm:w-32 sm:h-36" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link to={`/product/${l.product.slug}`} className="font-display text-xl sm:text-2xl hover:text-rose-dark">{l.product.name}</Link>
                        <div className="text-xs text-stone mt-1">
                          {l.product.sku}{l.size ? ` · Size ${l.size}` : ''} · Made to order, {l.product.productionTime}
                        </div>
                      </div>
                      <button onClick={() => removeLine(l.lineId)} aria-label={`Remove ${l.product.name}`} className="text-stone hover:text-noir h-fit">
                        <X size={18} strokeWidth={1.4} />
                      </button>
                    </div>

                    {eligible && (
                      <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer">
                        <input type="checkbox" checked={l.gemstoneTesting} onChange={(e) => setTesting(l.lineId, e.target.checked)} className="accent-noir" />
                        Gemstone testing (+{formatPKR(settings.gemstone_testing_fee_pkr)} per piece)
                      </label>
                    )}

                    <div className="flex items-end justify-between mt-4">
                      <div className="flex items-center border border-line">
                        <button onClick={() => updateQty(l.lineId, l.qty - 1)} className="w-9 h-9 flex items-center justify-center" aria-label="Decrease quantity">
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm">{l.qty}</span>
                        <button onClick={() => updateQty(l.lineId, l.qty + 1)} disabled={l.qty >= MAX_QTY} className="w-9 h-9 flex items-center justify-center disabled:opacity-30" aria-label="Increase quantity">
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{formatPKR(l.product.price * l.qty)}</div>
                        {eligible && l.gemstoneTesting && (
                          <div className="text-[11px] text-stone">+ {formatPKR(settings.gemstone_testing_fee_pkr * l.qty)} testing</div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <Link to="/shop" className="inline-block mt-6 text-xs uppercase tracking-[0.16em] text-stone hover:text-noir">← Continue shopping</Link>
        </div>

        <OrderSummary quote={quote} loading={loading} itemCount={count} promoCode={promoCode} onPromoChange={setPromoCode}>
          {error && <p className="text-sm text-danger mb-4">{error}</p>}
          <LinkButton to="/checkout" className={`w-full !py-4 ${error ? 'pointer-events-none opacity-40' : ''}`}>
            Checkout
          </LinkButton>
          <p className="text-xs text-stone mt-4 leading-relaxed">
            Payment by bank transfer. Production begins after we verify your payment. No change-of-mind returns —{' '}
            <Link to="/policies/returns" className="underline underline-offset-2">see policy</Link>.
          </p>
        </OrderSummary>
      </div>
    </div>
  )
}
