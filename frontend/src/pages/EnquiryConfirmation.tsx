import { Check } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { LinkButton } from '../components/Button'
import type { EnquiryDraft } from '../data/types'

const WHATSAPP_NUMBER = '923000000000'

export default function EnquiryConfirmation() {
  const { state } = useLocation() as { state: { enquiry?: EnquiryDraft } | null }
  const enquiry = state?.enquiry

  if (!enquiry) return <Navigate to="/custom-jewellery" replace />

  const isCustomize = enquiry.type === 'customize'
  const dateLabel = new Date(enquiry.submittedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const whatsappText = `Hello SULTANÉ, my ${isCustomize ? 'customisation request' : 'custom jewellery request'} has been saved. My reference is ${enquiry.ref}.${
    isCustomize ? ` I'd like to discuss changes to ${enquiry.productName}.` : enquiry.instructions ? ` ${enquiry.instructions}` : ''
  }`
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`

  return (
    <div>
      <div className="bg-blush">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 sm:py-20">
          <Check size={28} strokeWidth={1.5} className="text-maroon mb-5" />
          <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-4">
            Saved successfully / {isCustomize ? 'Customised design' : 'Custom jewellery'}
          </div>
          <h1 className="font-display text-5xl sm:text-6xl text-maroon mb-5 max-w-2xl leading-[1.05]">
            Your {isCustomize ? 'request' : 'idea'} has a place to begin.
          </h1>
          <p className="text-stone max-w-xl leading-relaxed mb-8">
            Thank you, {enquiry.name.split(' ')[0]}. Your {isCustomize ? 'customisation request' : 'enquiry'}
            {enquiry.fileNames.length > 0 && ` and ${enquiry.fileNames.length} private reference image${enquiry.fileNames.length > 1 ? 's' : ''}`}{' '}
            {enquiry.fileNames.length > 0 ? 'have' : 'has'} been saved for our team to review. You do not need to send
            them again.
          </p>

          <div className="bg-cream flex items-center justify-between p-6 max-w-xl">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-stone mb-1">Keep this enquiry reference</div>
              <div className="font-display text-2xl text-maroon">{enquiry.ref}</div>
            </div>
            <span className="bg-blush text-maroon text-xs px-3 py-1.5">New · Saved</span>
          </div>
          <p className="text-xs text-stone mt-4">Saved {dateLabel} · Fictitious sample contact details</p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 sm:py-20 grid lg:grid-cols-2 gap-16">
        <div>
          <h2 className="font-display text-3xl text-maroon mb-6 border-b border-line pb-5">A snapshot of your brief.</h2>
          <dl className="space-y-5">
            {isCustomize ? (
              <>
                <Row label="Piece" value={`${enquiry.productName} · ${enquiry.productSku}`} />
                <Row label="Requested changes" value={enquiry.instructions} />
              </>
            ) : (
              <>
                <Row label="Jewellery type" value={enquiry.jewelleryType ?? '—'} />
                {enquiry.budget && <Row label="Budget preference" value={`PKR ${enquiry.budget}`} />}
                {enquiry.sizeNotes && <Row label="Size / length" value={enquiry.sizeNotes} />}
                <Row label="Purity preference" value={enquiry.purityPreference ?? '—'} />
                {enquiry.instructions && <Row label="Instructions" value={enquiry.instructions} />}
              </>
            )}
            <Row label="Contact" value={`${enquiry.name} · ${enquiry.phone}${enquiry.email ? `\n${enquiry.email}` : ''}`} />
            {enquiry.fileNames.length > 0 && <Row label="Private references" value={enquiry.fileNames.join(' · ')} />}
          </dl>

          <div className="bg-cream-dark p-5 mt-8 mb-6">
            <div className="text-sm font-medium text-ink mb-1">Not an order or a quote</div>
            <p className="text-xs text-stone leading-relaxed">
              Your budget or notes are a preference, not an agreed price. No payment is due and no production or
              delivery date is confirmed.
            </p>
          </div>

          <LinkButton to="/shop" variant="outline" className="w-fit">Return to collections</LinkButton>
        </div>

        <div>
          <h2 className="font-display text-3xl text-maroon mb-6 border-b border-line pb-5">The next conversation.</h2>
          <ol className="space-y-6 mb-8">
            {[
              ['01', 'Our team reviews your idea', "We'll look at your brief and private references before getting in touch."],
              ['02', 'We confirm the details', 'Material, finish, size and feasibility are discussed with you.'],
              ['03', 'You review a proposed quote', 'Pricing and delivery estimates are agreed before any commitment.'],
            ].map(([n, title, body]) => (
              <li key={n} className="flex gap-5">
                <span className="font-display text-2xl text-maroon shrink-0 w-8">{n}</span>
                <div>
                  <div className="text-sm font-medium text-ink">{title}</div>
                  <div className="text-sm text-stone mt-0.5">{body}</div>
                </div>
              </li>
            ))}
          </ol>

          <div className="bg-cream-dark p-6">
            <div className="text-[11px] uppercase tracking-wide text-stone mb-2">Optional / Now that your request is saved</div>
            <p className="text-sm text-stone mb-4">Want to add a note? Open WhatsApp when you are ready. Nothing is sent automatically.</p>
            <div className="bg-cream p-4 text-sm text-ink mb-4">{whatsappText}</div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-3.5 hover:bg-maroon-dark transition-colors"
            >
              Open WhatsApp ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-stone mb-1">{label}</dt>
      <dd className="text-sm text-ink whitespace-pre-line">{value}</dd>
    </div>
  )
}
