import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getCollections, getProduct, submitEnquiry, ApiError } from '../lib/api'
import type { Collection, EnquiryDraft, Product } from '../data/types'
import ProductImage from '../components/ProductImage'
import FileDrop from '../components/FileDrop'
import { formatPKR } from '../lib/format'

export default function CustomizeExisting() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [collections, setCollections] = useState<Collection[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [instructions, setInstructions] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    getProduct(slug ?? '').then(setProduct).catch(() => setProduct(null))
    getCollections().then(setCollections).catch(() => setCollections([]))
  }, [slug])

  if (product === null) return <Navigate to="/shop" replace />
  if (product === undefined) {
    return <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-24 text-center text-stone">Loading…</div>
  }
  const collection = collections.find((c) => c.slug === product.collection)

  const canSubmit = name && phone && instructions && consent

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const formData = new FormData()
      formData.set('type', 'customize')
      formData.set('name', name)
      formData.set('phone', phone)
      if (email) formData.set('email', email)
      formData.set('productId', product.id)
      formData.set('productName', product.name)
      formData.set('productSku', product.sku)
      formData.set('instructions', instructions)
      files.forEach((f) => formData.append('files', f))

      const { ref } = await submitEnquiry(formData)

      const enquiry: EnquiryDraft = {
        ref,
        type: 'customize',
        submittedAt: new Date().toISOString(),
        name,
        phone,
        email: email || undefined,
        productName: product.name,
        productSku: product.sku,
        instructions,
        fileNames: files.map((f) => f.name),
      }
      navigate('/custom-jewellery/confirmation', { state: { enquiry } })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not save your request. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-10 grid lg:grid-cols-2 gap-14">
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">A personal conversation / Customise a design</div>
        <h1 className="font-display text-5xl text-maroon mb-4">Make it truly yours.</h1>
        <p className="text-stone mb-8 max-w-md">
          Tell us what you&rsquo;d like to change about this design. Your request is saved privately for our team to
          review; it is not an order or a commitment to purchase.
        </p>

        <div className="flex items-center gap-4 bg-cream-dark p-5 mb-8">
          <ProductImage category={product.category} collection={product.collection} className="w-20 h-20 shrink-0" iconClassName="w-8 h-8" />
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone">{collection?.name} · {product.sku}</div>
            <div className="font-display text-xl text-ink">{product.name}</div>
            <div className="text-sm text-stone">Original price {formatPKR(product.price)} · final price follows a conversation</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">01 / Your details</div>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <Field label="Full name *">
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="WhatsApp number *">
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 0000000" className={inputCls} />
            </Field>
          </div>
          <Field label="Email address (optional)" className="mb-8">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>

          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">02 / The change you imagine</div>
          <Field label="What would you like to change? *" className="mb-8">
            <textarea
              required
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="E.g. keep the pendant, change the chain to a 20-inch length, and adjust the ring to size 16."
              className={inputCls}
            />
          </Field>

          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">03 / Reference images · optional</div>
          <div className="mb-6">
            <FileDrop files={files} onChange={setFiles} />
          </div>

          <div className="bg-cream-dark p-5 mb-6">
            <div className="text-sm font-medium text-ink mb-1">Not an order or a quote</div>
            <p className="text-xs text-stone leading-relaxed">
              Pricing and feasibility are confirmed by our team before anything is agreed. We will never charge the
              original listed price for a modified design.
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-sm mb-6 cursor-pointer">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-maroon" />
            I consent to SULTANÉ storing my contact details, request and uploaded images privately so authorised
            staff can review and respond. *
          </label>

          {submitError && <p className="text-sm text-maroon mb-3">{submitError}</p>}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-4 hover:bg-maroon-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save my customisation request ↗'}
          </button>
          <p className="text-xs text-stone mt-3">
            This saves your request first. It does not open WhatsApp automatically. You can message us after your
            reference is created.
          </p>
        </form>
      </div>

      <div className="hidden lg:block">
        <ProductImage category={product.category} collection={product.collection} className="aspect-[4/5] w-full mb-8" iconClassName="w-20 h-20" />
        <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">Made personal, thoughtfully</div>
        <h2 className="font-display text-4xl text-maroon mb-5 leading-tight">
          Your vision.
          <br />A considered response.
        </h2>
        <ol className="space-y-4">
          {[
            ['01', 'Save your brief'],
            ['02', 'Discuss options with our team'],
            ['03', 'Review a quote before accepting'],
          ].map(([n, label]) => (
            <li key={n} className="flex items-center gap-4">
              <span className="font-display text-2xl text-maroon">{n}</span>
              <span className="text-sm text-ink">{label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-line bg-cream px-4 py-3 text-sm focus:outline-none focus:border-maroon'

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs text-stone mb-1.5">{label}</label>
      {children}
    </div>
  )
}
