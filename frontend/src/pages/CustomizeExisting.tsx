import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getProduct, submitEnquiry, ApiError } from '../lib/api'
import type { Product } from '../data/types'
import ProductImage from '../components/ProductImage'
import FileDrop from '../components/FileDrop'
import Field from '../components/Field'
import { Button } from '../components/Button'
import { formatPKR } from '../lib/format'

const IDEAS = ['Change the chain, keep the pendant', 'Different ring size', 'Different chain length or bracelet fit', 'Different finish or components']

// Journey B: request a modified version. This never adds anything to the
// bag and never takes payment — the owner quotes on WhatsApp first.
export default function CustomizeExisting() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [preferences, setPreferences] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getProduct(slug ?? '').then(setProduct).catch(() => setProduct(null))
  }, [slug])

  if (product === null) return <Navigate to="/shop" replace />
  if (product === undefined) return <div className="py-32 text-center text-stone">Loading…</div>
  if (!product.allowCustomisation) return <Navigate to={`/product/${product.slug}`} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('type', 'customize')
      fd.append('productId', product.id)
      fd.append('name', name)
      fd.append('phone', phone)
      fd.append('description', description)
      if (preferences) fd.append('preferences', preferences)
      files.forEach((f) => fd.append('files', f))
      const res = await submitEnquiry(fd)
      navigate('/custom-jewellery/confirmation', {
        state: { ref: res.ref, name, type: 'customize', productName: product.name, description },
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 sm:px-10 py-12">
      <Link to={`/product/${product.slug}`} className="text-xs text-stone hover:text-rose-dark">← Back to {product.name}</Link>
      <div className="grid lg:grid-cols-[1fr_340px] gap-12 mt-6">
        <form onSubmit={submit} className="space-y-6">
          <div>
            <div className="eyebrow text-rose-dark mb-3">Customise this design · Request price</div>
            <h1 className="font-display text-4xl sm:text-5xl text-noir mb-3">Make {product.name} yours</h1>
            <p className="text-stone leading-relaxed">
              Tell us what you would like to change. The owner and our jewellery maker will check what is possible and send you
              the price on WhatsApp. <strong className="text-ink font-medium">Nothing is charged and no order is placed</strong> until you
              approve the quotation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {IDEAS.map((idea) => (
              <button
                type="button"
                key={idea}
                onClick={() => setDescription((d) => (d ? `${d}\n${idea}: ` : `${idea}: `))}
                className="text-xs border border-line px-3 py-2 hover:border-rose hover:text-rose-dark"
              >
                + {idea}
              </button>
            ))}
          </div>

          <Field label="What would you like to change? *">
            <textarea
              required
              minLength={10}
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Keep the pendant but use a thicker 20-inch rope chain."
              className="field"
            />
          </Field>
          <Field label="Other preferences (optional)" hint="Size, length, occasion, deadline, budget — anything that helps.">
            <input value={preferences} onChange={(e) => setPreferences(e.target.value)} className="field" />
          </Field>

          <div>
            <span className="block text-xs text-stone mb-1.5">Reference images (optional)</span>
            <FileDrop files={files} onChange={setFiles} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Your name *">
              <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" autoComplete="name" />
            </Field>
            <Field label="WhatsApp number *" hint="We reply on WhatsApp.">
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 1234567" className="field" autoComplete="tel" />
            </Field>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Sending…' : 'Send request & continue on WhatsApp'}
          </Button>
        </form>

        <aside className="bg-cream-dark p-6 h-fit">
          <ProductImage src={product.images[0]?.url} alt={product.name} category={product.category} className="aspect-square w-full mb-4" />
          <div className="font-display text-2xl">{product.name}</div>
          <div className="text-xs text-stone mb-2">Product ID · {product.sku}</div>
          <div className="text-sm">Original design: {formatPKR(product.price)}</div>
          <p className="text-xs text-stone mt-3 leading-relaxed">
            The price of a customised version may differ from the original. Want the original as shown?{' '}
            <Link to={`/product/${product.slug}`} className="underline underline-offset-2">Add it to your bag</Link> instead.
          </p>
        </aside>
      </div>
    </div>
  )
}
