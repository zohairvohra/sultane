import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Minus, Plus, Clock, Gem, ShieldCheck, PenLine, Check, ChevronDown } from 'lucide-react'
import { getProduct, getProducts } from '../lib/api'
import type { Product } from '../data/types'
import ProductImage from '../components/ProductImage'
import ProductCard from '../components/ProductCard'
import { Button, LinkButton } from '../components/Button'
import { formatPKR } from '../lib/format'
import { useCart, MAX_QTY } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import { useCollections } from '../lib/useCollections'

function Accordion({ title, children, open: initial = false }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <div className="border-t border-line">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-5 text-left" aria-expanded={open}>
        <span className="text-[12px] uppercase tracking-[0.16em]">{title}</span>
        <ChevronDown size={16} strokeWidth={1.4} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-6 text-sm text-stone leading-relaxed">{children}</div>}
    </div>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const { addToCart } = useCart()
  const { settings } = useSettings()
  const collections = useCollections()

  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [related, setRelated] = useState<Product[]>([])
  const [active, setActive] = useState(0)
  const [size, setSize] = useState<string | undefined>()
  const [sizeError, setSizeError] = useState(false)
  const [qty, setQty] = useState(1)
  const [testing, setTesting] = useState(true)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setProduct(undefined)
    setActive(0)
    setSize(undefined)
    setSizeError(false)
    setQty(1)
    setTesting(true) // gemstone testing is selected by default
    getProduct(slug ?? '').then(setProduct).catch(() => setProduct(null))
  }, [slug])

  useEffect(() => {
    if (!product) return
    const query = product.collections[0] ? { collection: product.collections[0] } : { category: product.category }
    getProducts(query)
      .then((list) => setRelated(list.filter((p) => p.id !== product.id && p.isMens === product.isMens).slice(0, 4)))
      .catch(() => setRelated([]))
  }, [product])

  if (product === null) return <Navigate to="/shop" replace />
  if (product === undefined) return <div className="mx-auto max-w-[1400px] px-6 py-32 text-center text-stone">Loading…</div>

  const fee = settings.gemstone_testing_fee_pkr
  const testingEligible = product.isPremium && product.testingAvailable && !!product.gemstone
  const paused = product.status === 'paused'
  const unit = product.price + (testingEligible && testing ? fee : 0)
  const productCollections = collections.filter((c) => product.collections.includes(c.slug))
  const images = product.images.length ? product.images : [null]

  const handleAdd = () => {
    if (product.sizes.length && !size) {
      setSizeError(true)
      return
    }
    addToCart(product, size, qty, testingEligible && testing)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div>
      <nav className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-6 text-xs text-stone" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-rose-dark">Home</Link>
        <span className="mx-2">/</span>
        {product.isMens ? (
          <Link to="/mens" className="hover:text-rose-dark">Men's</Link>
        ) : (
          <Link to={`/${product.category.toLowerCase()}`} className="hover:text-rose-dark">{product.category}</Link>
        )}
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-8 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16">
        {/* Gallery */}
        <div className="lg:sticky lg:top-36 h-fit">
          <ProductImage src={images[active]?.url} alt={product.name} category={product.category} className="aspect-square w-full" loading="eager" />
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3 mt-3">
              {images.map((img, i) => (
                <button
                  key={img?.id ?? i}
                  onClick={() => setActive(i)}
                  aria-label={`Show photograph ${i + 1}`}
                  className={`border ${i === active ? 'border-noir' : 'border-transparent'} transition-colors`}
                >
                  <ProductImage src={img?.url} alt="" category={product.category} className="aspect-square w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {productCollections.map((c) => (
              <Link key={c.slug} to={`/collections/${c.slug}`} className="eyebrow text-rose-dark hover:underline underline-offset-4">{c.name}</Link>
            ))}
            {product.isPremium && <span className="eyebrow bg-rosegold text-noir px-2 py-0.5">Premium Collection</span>}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-noir leading-[1.05] mb-3">{product.name}</h1>
          <div className="text-2xl text-ink mb-4">{formatPKR(product.price)}</div>

          <div className="flex flex-wrap items-center gap-3 mb-6 text-xs">
            {product.purity925 && (
              <span className="inline-flex items-center gap-1.5 border border-silver px-3 py-1.5 tracking-wide">
                <ShieldCheck size={13} strokeWidth={1.5} className="text-rose" /> 925 Sterling Silver
              </span>
            )}
            <span className="text-stone">Product ID · {product.sku}</span>
          </div>

          <p className="text-stone leading-relaxed mb-6">{product.description}</p>

          {product.gemstone && (
            <div className="border border-line p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Gem size={16} strokeWidth={1.3} className="text-rose" />
                <span className="text-[12px] uppercase tracking-[0.16em]">Gemstone details</span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
                <dt className="text-stone">Gemstone</dt>
                <dd>{product.gemstone.type}</dd>
                {product.gemstone.origin && (
                  <>
                    <dt className="text-stone">Classification</dt>
                    <dd>{product.gemstone.origin === 'natural' ? 'Natural' : 'Laboratory-created'}</dd>
                  </>
                )}
                {product.gemstone.details && (
                  <>
                    <dt className="text-stone">Details</dt>
                    <dd>{product.gemstone.details}</dd>
                  </>
                )}
              </dl>
              {product.certificationInfo && <p className="text-xs text-stone mt-3 leading-relaxed">{product.certificationInfo}</p>}
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] uppercase tracking-[0.16em]">
                  Size {size ? <span className="text-stone normal-case tracking-normal">· {size}</span> : null}
                </span>
                <span className="text-xs text-stone">Need another size? Request a customisation below.</span>
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={size === s}
                    onClick={() => {
                      setSize(s)
                      setSizeError(false)
                    }}
                    className={`min-w-12 h-12 px-3 text-sm border transition-colors ${size === s ? 'bg-noir text-cream border-noir' : 'border-line hover:border-noir'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizeError && <p className="text-xs text-danger mt-2">Please choose a size.</p>}
            </div>
          )}

          {testingEligible && (
            <label className={`flex items-start gap-3 p-5 mb-6 cursor-pointer border transition-colors ${testing ? 'border-rose bg-blush-light' : 'border-line'}`}>
              <input type="checkbox" checked={testing} onChange={(e) => setTesting(e.target.checked)} className="mt-1 accent-noir w-4 h-4" />
              <span>
                <span className="block text-sm font-medium text-ink">Gemstone testing &amp; certification · +{formatPKR(fee)} per piece</span>
                <span className="block text-xs text-stone mt-1 leading-relaxed">
                  Selected by default. Untick to buy without testing — the fee is only charged when selected, and your choice is
                  saved on your order.
                </span>
              </span>
            </label>
          )}

          <div className="flex items-center gap-3 text-sm text-stone mb-6">
            <Clock size={16} strokeWidth={1.3} className="text-rose shrink-0" />
            <span>
              Made to order · estimated production <strong className="text-ink font-medium">{product.productionTime}</strong> after payment
              verification. Courier delivery time is additional.
            </span>
          </div>

          {paused ? (
            <div className="bg-cream-dark p-5 text-sm text-stone mb-4">
              Orders for this design are temporarily paused. You can still request a customised version or ask us on WhatsApp when
              it will be available again.
            </div>
          ) : (
            <div className="flex items-stretch gap-3 mb-3">
              <div className="flex items-center border border-line">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-full flex items-center justify-center" aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} className="w-11 h-full flex items-center justify-center" aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
              <Button onClick={handleAdd} className="flex-1 !py-4">
                {added ? (
                  <span className="inline-flex items-center gap-2"><Check size={14} /> Added to bag</span>
                ) : (
                  `Add to Cart · ${formatPKR(unit * qty)}`
                )}
              </Button>
            </div>
          )}
          {added && (
            <Link to="/cart" className="block text-center text-xs uppercase tracking-[0.16em] text-rose-dark underline underline-offset-4 mb-3">
              View bag & checkout
            </Link>
          )}

          {/* Journey B — clearly separate from purchasing the original design */}
          {product.allowCustomisation && (
            <div className="border border-dashed border-silver p-5 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <PenLine size={15} strokeWidth={1.4} className="text-rose" />
                <span className="text-sm font-medium">Want it slightly different?</span>
              </div>
              <p className="text-xs text-stone leading-relaxed mb-4">
                Change the chain, size, components or finish. A customised version is <strong>not</strong> added to your bag —
                we review your request and send you a price on WhatsApp first.
              </p>
              <LinkButton to={`/customize/${product.slug}`} variant="outline" icon={false} className="w-full">
                Customise This Design — Request Price
              </LinkButton>
            </div>
          )}

          <div className="mt-8">
            <Accordion title="Material & purity" open>
              {product.purity925 ? <p>925 sterling silver — confirmed for this design.</p> : <p>Silver. Purity details are confirmed on request.</p>}
              {product.materialNote && <p className="mt-2">{product.materialNote}</p>}
            </Accordion>
            <Accordion title="Delivery & returns">
              <p>
                Free delivery within Karachi; a charge of {formatPKR(settings.delivery_fee_other_pkr)} applies elsewhere in Pakistan and is shown
                before you order. No change-of-mind returns. Defective or incorrect items must be reported on WhatsApp within 24 hours of delivery.
              </p>
              <p className="mt-2">
                <Link to="/policies/delivery" className="underline underline-offset-2">Delivery policy</Link> ·{' '}
                <Link to="/policies/returns" className="underline underline-offset-2">Returns &amp; defects</Link>
              </p>
            </Accordion>
            <Accordion title="Authenticity">
              <p>
                Once your payment is verified, this piece receives its own unique article number, shared on your order page and WhatsApp and
                printed on your SULTANÉ authenticity card with a QR code. Anyone can confirm it on our{' '}
                <Link to="/verify" className="underline underline-offset-2">Verify Your Piece</Link> page.
              </p>
            </Accordion>
            <Accordion title="Care">
              <p>Store separately in the pouch provided, keep dry, avoid perfume and chemicals, and polish gently with your SULTANÉ cloth.</p>
            </Accordion>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="bg-blush-light">
          <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16">
            <h2 className="font-display text-4xl text-noir mb-10">You may also like</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
