import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Heart, Minus, Plus } from 'lucide-react'
import { getCollections, getProduct, getProducts } from '../lib/api'
import type { Collection, Product } from '../data/types'
import ProductImage from '../components/ProductImage'
import ProductCard from '../components/ProductCard'
import { Button, LinkButton } from '../components/Button'
import { formatPKR } from '../lib/format'
import { useCart, GEMSTONE_TESTING_FEE } from '../context/CartContext'

export default function ProductDetail() {
  const { slug } = useParams()
  const { addToCart } = useCart()

  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [collections, setCollections] = useState<Collection[]>([])
  const [related, setRelated] = useState<Product[]>([])
  const [size, setSize] = useState<string | undefined>(undefined)
  const [qty, setQty] = useState(1)
  const [testing, setTesting] = useState(true)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setProduct(undefined)
    getCollections().then(setCollections).catch(() => setCollections([]))
    getProduct(slug ?? '')
      .then((p) => {
        setProduct(p)
        setSize(p?.sizes?.[1] ?? p?.sizes?.[0])
        setTesting(true)
        setQty(1)
      })
      .catch(() => setProduct(null))
    getProducts()
      .then((all) => {
        const sameCollection = all.filter((p) => p.slug !== slug && p.collection === all.find((x) => x.slug === slug)?.collection)
        const fallback = all.filter((p) => p.slug !== slug)
        setRelated((sameCollection.length >= 4 ? sameCollection : fallback).slice(0, 4))
      })
      .catch(() => setRelated([]))
  }, [slug])

  if (product === null) return <Navigate to="/shop" replace />
  if (product === undefined) {
    return <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-24 text-center text-stone">Loading…</div>
  }

  const collection = collections.find((c) => c.slug === product.collection)
  const unitPrice = product.price + (product.hasGemstone && testing ? GEMSTONE_TESTING_FEE : 0)

  const handleAdd = () => {
    addToCart(product, size, qty, product.hasGemstone ? testing : undefined)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div>
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-6 pb-2 text-xs text-stone">
        <Link to="/shop" className="hover:text-maroon">Shop all</Link> /{' '}
        <Link to={`/shop?collection=${product.collection}`} className="hover:text-maroon">{collection?.name}</Link> /{' '}
        <span className="text-ink">{product.name}</span>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-8 grid lg:grid-cols-2 gap-12">
        <div>
          <ProductImage
            category={product.category}
            collection={product.collection}
            className="aspect-square w-full mb-4"
            iconClassName="w-28 h-28"
          />
          <div className="grid grid-cols-2 gap-4">
            <ProductImage category={product.category} collection={product.collection} className="aspect-square w-full" iconClassName="w-14 h-14" />
            <ProductImage category={product.category} collection={product.collection} className="aspect-square w-full" iconClassName="w-14 h-14" />
          </div>
          <p className="text-xs text-stone mt-3">Illustrative product images. Final appearance and specifications may differ.</p>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-3">
            {collection?.name} / {collection?.tagline.replace('.', '')}
          </div>
          <h1 className="font-display text-5xl text-maroon leading-[1.05] mb-4">{product.name}</h1>
          <div className="text-xl text-ink mb-5">{formatPKR(product.price)}</div>
          <p className="text-stone leading-relaxed mb-5">{product.description}</p>

          <div className="flex items-center gap-3 mb-6">
            {product.availability === 'available' ? (
              <span className="bg-success-bg text-success text-xs px-3 py-1.5">Available · sample stock 3</span>
            ) : (
              <span className="bg-warn-bg text-maroon text-xs px-3 py-1.5">Made to enquire</span>
            )}
            <span className="text-xs text-stone">SKU · {product.sku}</span>
          </div>

          <div className="border-t border-line pt-6 mb-6">
            {product.sizes && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-stone">
                    {product.category === 'Rings' ? 'Ring size' : 'Size'} · Selected {size}
                  </span>
                  <button className="text-xs text-maroon underline underline-offset-2">Size guide</button>
                </div>
                <div className="flex gap-2 mb-3">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`w-12 h-12 text-sm border transition-colors ${
                        size === s ? 'bg-maroon text-cream border-maroon' : 'border-line text-ink hover:border-maroon'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-stone mb-2">Finish: Silver tone · Size system pending confirmation</p>
              </>
            )}
          </div>

          {product.hasGemstone && (
            <div className="bg-cream-dark p-5 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testing}
                  onChange={(e) => setTesting(e.target.checked)}
                  className="mt-1 accent-maroon"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">
                    Add gemstone testing &amp; certification — {formatPKR(GEMSTONE_TESTING_FEE)}
                  </span>
                  <span className="block text-xs text-stone mt-1">
                    Selected by default. Untick to purchase without testing. Fee is only added when selected, and
                    your choice is preserved on the order record.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center border border-line">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center hover:text-maroon">
                <Minus size={14} />
              </button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-11 h-11 flex items-center justify-center hover:text-maroon">
                <Plus size={14} />
              </button>
            </div>
            <Button onClick={handleAdd} className="flex-1">
              {added ? 'Added to bag' : `Add to bag · ${formatPKR(unitPrice * qty)}`}
            </Button>
          </div>

          <button className="flex items-center gap-2 text-sm text-maroon mb-6">
            <Heart size={15} strokeWidth={1.75} /> Save to wishlist
          </button>

          <LinkButton to={`/customize/${product.slug}`} variant="outline" icon={false} className="w-full mb-8">
            Customise this design — request price
          </LinkButton>

          <div className="bg-cream-dark p-5 mb-8">
            <div className="text-sm font-medium text-ink mb-2">A concept piece, transparently presented</div>
            <p className="text-xs text-stone leading-relaxed">
              Material: silver jewellery{product.purity925 ? ', 925 sterling silver' : ' concept; composition and fineness pending confirmation'}.
              <br />
              Weight: pending confirmation. No purity or authenticity claim beyond what is stated here.
            </p>
          </div>

          <div className="border-t border-line pt-6 mb-6">
            <h2 className="font-display text-xl text-ink mb-2">Care &amp; keeping</h2>
            <p className="text-sm text-stone leading-relaxed">
              Keep dry, store separately and wipe with a soft cloth. Avoid perfume and harsh cleaners. Estimated
              production time: {product.productionDays}.
            </p>
          </div>
          <div className="border-t border-line pt-6">
            <h2 className="font-display text-xl text-ink mb-2">Delivery &amp; returns</h2>
            <p className="text-sm text-stone leading-relaxed">
              Free delivery within Karachi; charges apply elsewhere in Pakistan, shown at checkout. No change-of-mind
              returns; defects reported within 24 hours of delivery via WhatsApp are handled separately.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blush-light">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16">
          <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-3">Continue the conversation</div>
          <h2 className="font-display text-4xl text-maroon mb-10">Beautiful, in good company.</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
