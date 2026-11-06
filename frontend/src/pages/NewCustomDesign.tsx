import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, MessageCircle, Hammer } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import FileDrop from '../components/FileDrop'
import Field from '../components/Field'
import { Button } from '../components/Button'
import { submitEnquiry, ApiError } from '../lib/api'
import { CATEGORIES } from '../data/types'

export default function NewCustomDesign() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
  const [jewelleryType, setJewelleryType] = useState('')
  const [description, setDescription] = useState('')
  const [preferences, setPreferences] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!files.length) {
      setError('Please add at least one inspiration image.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('type', 'new-design')
      fd.append('name', name)
      fd.append('phone', phone)
      fd.append('description', description)
      if (jewelleryType) fd.append('jewelleryType', jewelleryType)
      if (preferences) fd.append('preferences', preferences)
      files.forEach((f) => fd.append('files', f))
      const res = await submitEnquiry(fd)
      navigate('/custom-jewellery/confirmation', { state: { ref: res.ref, name, type: 'new-design', jewelleryType, description } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageBanner
        eyebrow="Customized Jewellery"
        title="Imagine it. We'll make it."
        description="Share an inspiration image and describe the piece you have in mind. We'll discuss the design, feasibility, price and production time with you on WhatsApp."
      />

      <div className="mx-auto max-w-[1100px] px-6 sm:px-10 py-14">
        <ol className="grid sm:grid-cols-3 gap-6 mb-14">
          {[
            { icon: Upload, title: '1. Share your idea', body: 'Upload an inspiration image and describe your piece.' },
            { icon: MessageCircle, title: '2. Talk on WhatsApp', body: 'We confirm feasibility, price and timeline with you.' },
            { icon: Hammer, title: '3. Made for you', body: 'Production starts once you approve and your payment is verified.' },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="border-t border-rose pt-5">
              <Icon size={20} strokeWidth={1.3} className="text-rose mb-3" />
              <div className="font-display text-xl mb-1">{title}</div>
              <p className="text-sm text-stone">{body}</p>
            </li>
          ))}
        </ol>

        <form onSubmit={submit} className="space-y-6 max-w-3xl">
          <div>
            <span className="block text-xs text-stone mb-1.5">Inspiration image *</span>
            <FileDrop files={files} onChange={setFiles} title="Upload your inspiration" />
          </div>

          <Field label="Type of jewellery">
            <select value={jewelleryType} onChange={(e) => setJewelleryType(e.target.value)} className="field">
              <option value="">Not sure yet</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Describe the piece you want *">
            <textarea
              required
              minLength={10}
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you love about the inspiration? What should be different?"
              className="field"
            />
          </Field>

          <Field label="Requirements or preferences (optional)" hint="Size, gemstones, chain length, occasion date, budget…">
            <textarea rows={3} value={preferences} onChange={(e) => setPreferences(e.target.value)} className="field" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Your name *">
              <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" autoComplete="name" />
            </Field>
            <Field label="Contact number (WhatsApp) *">
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 1234567" className="field" autoComplete="tel" />
            </Field>
          </div>

          <p className="text-xs text-stone">Please don't upload identity or payment documents. Your images are visible only to the SULTANÉ team.</p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit & continue on WhatsApp'}
          </Button>
        </form>
      </div>
    </div>
  )
}
