import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronDown, MessageCircle, Package, PenLine, AlertTriangle, ShieldCheck } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import RichText from '../components/RichText'
import { ExternalButton, LinkButton } from '../components/Button'
import { useSettings } from '../context/SettingsContext'
import { waLink, displayPhone } from '../lib/whatsapp'

export function About() {
  const { settings } = useSettings()
  return (
    <div>
      <PageBanner eyebrow="About us" title="The SULTANÉ Story" tone="noir" />
      <div className="mx-auto max-w-[760px] px-6 sm:px-10 py-16">
        <RichText text={settings.about_story} className="text-stone text-lg" />
        <div className="grid sm:grid-cols-3 gap-6 mt-14 pt-10 border-t border-line text-sm">
          {[
            { t: 'Made to order', b: 'Every piece is made by our jewellery maker after your payment is verified.' },
            { t: 'Honest materials', b: '“925 Sterling Silver” appears only on pieces whose material is confirmed.' },
            { t: 'Registered pieces', b: 'Each purchase receives a unique article number you can verify any time.' },
          ].map((x) => (
            <div key={x.t}>
              <div className="font-display text-xl mb-1">{x.t}</div>
              <p className="text-stone">{x.b}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-4">
          <LinkButton to="/shop">Shop the collection</LinkButton>
          <LinkButton to="/verify" variant="outline">Verify your piece</LinkButton>
        </div>
      </div>
    </div>
  )
}

export function Faq() {
  const { settings } = useSettings()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div>
      <PageBanner eyebrow="Help" title="Frequently asked questions" />
      <div className="mx-auto max-w-[820px] px-6 sm:px-10 py-14">
        <div className="border-t border-line">
          {settings.faqs.map((f, i) => (
            <div key={f.q} className="border-b border-line">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex justify-between gap-6 py-6 text-left" aria-expanded={open === i}>
                <span className="font-display text-xl sm:text-2xl">{f.q}</span>
                <ChevronDown size={18} strokeWidth={1.3} className={`shrink-0 mt-1.5 transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="pb-6 -mt-2 text-stone leading-relaxed whitespace-pre-line">{f.a}</p>}
            </div>
          ))}
        </div>
        <ContactPrompt />
      </div>
    </div>
  )
}

function ContactPrompt() {
  const { settings } = useSettings()
  return (
    <div className="bg-cream-dark p-6 sm:p-8 mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
      <div>
        <div className="font-display text-2xl mb-1">Still have a question?</div>
        <p className="text-sm text-stone">WhatsApp is the fastest way to reach us.</p>
      </div>
      <ExternalButton href={waLink(settings.whatsapp_number, 'Hello SULTANÉ, I have a question.')}>
        <MessageCircle size={14} /> Chat on WhatsApp
      </ExternalButton>
    </div>
  )
}

export function Contact() {
  const { settings } = useSettings()
  const n = settings.whatsapp_number
  const options = [
    { icon: MessageCircle, title: 'General enquiries', body: 'Questions about pieces, sizes, gifts or delivery.', text: 'Hello SULTANÉ, I have a question.' },
    { icon: Package, title: 'An existing order', body: 'Include your order number and we will update you.', text: 'Hello SULTANÉ, I have a question about my order SLT-' },
    { icon: PenLine, title: 'Customisation', body: 'Modify a design or create something new.', text: 'Hello SULTANÉ, I would like to discuss a custom piece.' },
    { icon: AlertTriangle, title: 'Report a problem', body: 'Defective or incorrect item — within 24 hours of delivery, with photos/video.', text: 'Hello SULTANÉ, I want to report a problem with order SLT-\n\nProblem: ' },
  ]
  return (
    <div>
      <PageBanner eyebrow="Contact" title="We're on WhatsApp" description={`Message us on ${displayPhone(n)} — our team replies personally.`} />
      <div className="mx-auto max-w-[1100px] px-6 sm:px-10 py-14 grid sm:grid-cols-2 gap-5">
        {options.map(({ icon: Icon, title, body, text }) => (
          <a key={title} href={waLink(n, text)} target="_blank" rel="noopener noreferrer" className="border border-line p-7 hover:border-rose transition-colors group">
            <Icon size={22} strokeWidth={1.2} className="text-rose mb-4" />
            <div className="font-display text-2xl mb-1 group-hover:text-rose-dark">{title}</div>
            <p className="text-sm text-stone">{body}</p>
          </a>
        ))}
      </div>
      <div className="mx-auto max-w-[1100px] px-6 sm:px-10 pb-16 text-sm text-stone">
        Looking for something else? <Link to="/faq" className="underline">Read our FAQs</Link>, <Link to="/track-order" className="underline">track an order</Link> or{' '}
        <Link to="/verify" className="underline">verify a piece</Link>.
      </div>
    </div>
  )
}

const POLICIES = {
  delivery: { key: 'policy_delivery', title: 'Delivery' },
  returns: { key: 'policy_returns', title: 'Returns & defective items' },
  privacy: { key: 'policy_privacy', title: 'Privacy policy' },
  terms: { key: 'policy_terms', title: 'Terms of sale' },
} as const

export function Policy() {
  const { slug } = useParams()
  const { settings } = useSettings()
  const policy = POLICIES[slug as keyof typeof POLICIES]
  if (!policy) return <Navigate to="/policies/delivery" replace />
  const text = settings[policy.key]
  return (
    <div>
      <PageBanner eyebrow="Policies" title={policy.title} tone="silver" />
      <div className="mx-auto max-w-[1100px] px-6 sm:px-10 py-14 grid md:grid-cols-[200px_1fr] gap-10">
        <nav className="flex md:flex-col gap-4 text-sm flex-wrap">
          {Object.entries(POLICIES).map(([s, p]) => (
            <Link key={s} to={`/policies/${s}`} className={s === slug ? 'text-rose-dark' : 'text-stone hover:text-noir'}>
              {p.title}
            </Link>
          ))}
        </nav>
        <div>
          <RichText text={text || 'This policy is being updated.'} className="text-stone" />
          {slug === 'returns' && (
            <ExternalButton href={waLink(settings.whatsapp_number, 'Hello SULTANÉ, I want to report a problem with order SLT-\n\nProblem: ')} className="mt-8">
              <MessageCircle size={14} /> Report a problem on WhatsApp
            </ExternalButton>
          )}
        </div>
      </div>
    </div>
  )
}

export function Care() {
  return (
    <div>
      <PageBanner eyebrow="Jewellery care" title="Caring for your silver" />
      <div className="mx-auto max-w-[900px] px-6 sm:px-10 py-14 grid sm:grid-cols-2 gap-10 text-stone leading-relaxed">
        {[
          ['Store separately', 'Keep each piece in its SULTANÉ pouch or box so chains don’t tangle and surfaces don’t scratch.'],
          ['Last on, first off', 'Put jewellery on after perfume, lotion and hairspray, and take it off before bathing, swimming or exercise.'],
          ['Polish gently', 'Use the polishing cloth included in your packaging. Avoid abrasive cleaners and dips on gemstone pieces.'],
          ['Gemstones', 'Protect stones from knocks and sudden temperature changes. Ask us before cleaning a Premium piece.'],
        ].map(([t, b]) => (
          <div key={t}>
            <div className="font-display text-2xl text-noir mb-2">{t}</div>
            <p>{b}</p>
          </div>
        ))}
        <div className="sm:col-span-2 flex items-center gap-3 bg-cream-dark p-5 text-sm">
          <ShieldCheck size={18} strokeWidth={1.3} className="text-rose shrink-0" />
          Keep your authenticity card safe — its article number and QR code link your piece to our registry.
        </div>
      </div>
    </div>
  )
}
