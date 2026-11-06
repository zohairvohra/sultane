import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductImage from '../components/ProductImage'
import FileDrop from '../components/FileDrop'
import { submitEnquiry, ApiError } from '../lib/api'
import type { EnquiryDraft } from '../data/types'

const JEWELLERY_TYPES = ['Ring', 'Earrings', 'Pendant', 'Bracelet', 'Chain', 'Necklace']
const PURITY_OPTIONS = ['No preference — discuss options', '925 sterling silver requested', 'Open to alternatives']

export default function NewCustomDesign() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [jewelleryType, setJewelleryType] = useState(JEWELLERY_TYPES[0])
  const [purity, setPurity] = useState(PURITY_OPTIONS[0])
  const [budget, setBudget] = useState('')
  const [sizeNotes, setSizeNotes] = useState('')
  const [instructions, setInstructions] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const canSubmit = name && phone && jewelleryType && consent

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const formData = new FormData()
      formData.set('type', 'new-design')
      formData.set('name', name)
      formData.set('phone', phone)
      if (email) formData.set('email', email)
      formData.set('jewelleryType', jewelleryType)
      formData.set('purityPreference', purity)
      if (budget) formData.set('budgetRange', budget)
      if (sizeNotes) formData.set('sizeNotes', sizeNotes)
      if (instructions) formData.set('instructions', instructions)
      files.forEach((f) => formData.append('files', f))

      const { ref } = await submitEnquiry(formData)

      const enquiry: EnquiryDraft = {
        ref,
        type: 'new-design',
        submittedAt: new Date().toISOString(),
        name,
        phone,
        email: email || undefined,
        jewelleryType,
        purityPreference: purity,
        budget: budget || undefined,
        sizeNotes: sizeNotes || undefined,
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
        <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">A personal conversation / Custom jewellery</div>
        <h1 className="font-display text-5xl text-maroon mb-4">Begin with an idea.</h1>
        <p className="text-stone mb-10 max-w-md">
          Tell us what you imagine. Your enquiry is saved privately for our team to review; it is not an order or a
          commitment to purchase.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">01 / Your details</div>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
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

          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">02 / The piece you imagine</div>
          <div className="grid sm:grid-cols-2 gap-4 mb-2">
            <Field label="Jewellery type *">
              <select required value={jewelleryType} onChange={(e) => setJewelleryType(e.target.value)} className={inputCls}>
                {JEWELLERY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Purity preference (optional)">
              <select value={purity} onChange={(e) => setPurity(e.target.value)} className={inputCls}>
                {PURITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-xs text-stone mb-5">
            Rings, earrings, pendants, bracelets, chains or necklaces. Any material or purity request is subject to
            team confirmation.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <Field label="Budget range, PKR (optional)">
              <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="20,000–30,000" className={inputCls} />
            </Field>
            <Field label="Size / length notes (optional)">
              <input value={sizeNotes} onChange={(e) => setSizeNotes(e.target.value)} placeholder="18-inch chain, small pendant" className={inputCls} />
            </Field>
          </div>
          <Field label="Instructions / inspiration (optional)" className="mb-8">
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe the motif, mood or occasion behind the piece."
              className={inputCls}
            />
          </Field>

          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">03 / Private reference images · optional</div>
          <div className="mb-6">
            <FileDrop files={files} onChange={setFiles} />
          </div>

          <div className="bg-cream-dark p-5 mb-6">
            <div className="text-sm font-medium text-ink mb-1">Private, staff-only references</div>
            <p className="text-xs text-stone leading-relaxed">
              Your uploads are intended only for authorised staff reviewing this enquiry. They are not published, used
              in the storefront gallery or included in registry results.
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-sm mb-6 cursor-pointer">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-maroon" />
            I consent to SULTANÉ storing my contact details, enquiry and uploaded images privately so authorised
            staff can review and respond. I have read the privacy notice. *
          </label>

          {submitError && <p className="text-sm text-maroon mb-3">{submitError}</p>}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-4 hover:bg-maroon-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save my custom request ↗'}
          </button>
          <p className="text-xs text-stone mt-3">
            This saves your request first. It does not open WhatsApp automatically. You can choose to message us
            after your reference is created.
          </p>
        </form>
      </div>

      <div className="hidden lg:block">
        <ProductImage category="Pendants" collection="bharat" className="aspect-[4/5] w-full mb-8" iconClassName="w-20 h-20" />
        <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">Made personal, thoughtfully</div>
        <h2 className="font-display text-4xl text-maroon mb-5 leading-tight">
          Your vision.
          <br />A considered response.
        </h2>
        <p className="text-stone leading-relaxed mb-8">
          We&rsquo;ll review the idea, discuss what is possible and confirm specifications, price and a delivery
          estimate before you decide.
        </p>
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
