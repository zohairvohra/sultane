import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import ProductImage from '../components/ProductImage'
import OrderSummary from '../components/OrderSummary'
import { Button } from '../components/Button'
import { formatPKR } from '../lib/format'
import { collectionBySlug } from '../data/collections'

export default function Cart() {
  const { lines, updateQty, removeLine, subtotal, testingFees, count } = useCart()
  const [city, setCity] = useState('Lahore, Punjab')
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-10">
      <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">
        Your selection / {count} {count === 1 ? 'piece' : 'pieces'}
      </div>
      <h1 className="font-display text-5xl text-maroon mb-3">A little something, for you.</h1>
      <p className="text-stone mb-10">
        Your bag holds {count} illustrative {count === 1 ? 'piece' : 'pieces'}. Review the details before continuing
        to guest checkout.
      </p>

      {lines.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-stone mb-6">Your bag is empty.</p>
          <Link to="/shop" className="text-maroon underline underline-offset-2">Continue exploring</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          <div>
            <div className="hidden sm:flex justify-between text-[11px] uppercase tracking-wide text-stone border-b border-line pb-3">
              <span>Piece &amp; details</span>
              <span>Price · PKR</span>
            </div>

            {lines.map((line) => {
              const collection = collectionBySlug(line.product.collection)
              return (
                <div key={line.lineId} className="flex gap-5 border-b border-line py-6">
                  <ProductImage
                    category={line.product.category}
                    collection={line.product.collection}
                    className="w-28 h-28 shrink-0"
                    iconClassName="w-10 h-10"
                  />
                  <div className="flex-1 flex flex-col sm:flex-row sm:justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-stone mb-1">{collection?.name}</div>
                      <Link to={`/product/${line.product.slug}`} className="font-display text-2xl text-ink hover:text-maroon">
                        {line.product.name}
                      </Link>
                      <p className="text-xs text-stone mt-1">
                        {line.size ? `Size ${line.size} · ` : ''}Silver tone · Illustrative piece
                        {line.gemstoneTesting && ' · Gemstone testing included'}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center border border-line">
                          <button
                            onClick={() => updateQty(line.lineId, line.qty - 1)}
                            className="w-9 h-9 flex items-center justify-center hover:text-maroon"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center text-sm">{line.qty}</span>
                          <button
                            onClick={() => updateQty(line.lineId, line.qty + 1)}
                            className="w-9 h-9 flex items-center justify-center hover:text-maroon"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <button className="text-xs text-stone underline underline-offset-2">Save for later</button>
                        <button
                          onClick={() => removeLine(line.lineId)}
                          className="text-xs text-stone underline underline-offset-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-ink sm:text-right shrink-0">
                      {formatPKR(line.product.price * line.qty)}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="flex items-center justify-between mt-6">
              <Link to="/shop" className="text-sm text-maroon">← Continue exploring</Link>
              <span className="text-xs text-stone">Availability is rechecked when an order is confirmed.</span>
            </div>

            <div className="bg-cream-dark p-5 mt-8">
              <div className="text-sm font-medium text-ink mb-1">A note on your selection</div>
              <p className="text-xs text-stone leading-relaxed">
                Prices, stock and product specifications are sample concept data. Material, fineness and weight need
                confirmation for the approved catalogue.
              </p>
            </div>
          </div>

          <OrderSummary
            title="Your order, considered."
            subtotal={subtotal}
            testingFees={testingFees}
            itemCount={count}
            city={city}
            onCityChange={setCity}
            cta={
              <Button onClick={() => navigate('/checkout')} className="w-full mb-4">
                Continue as guest
              </Button>
            }
            footnote={
              <p className="text-xs text-stone">
                No account needed. Pay by cash on delivery or bank transfer at checkout.
              </p>
            }
          />
        </div>
      )}
    </div>
  )
}
