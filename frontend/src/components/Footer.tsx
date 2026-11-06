import { Link } from 'react-router-dom'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { useCollections } from '../lib/useCollections'
import { waLink, displayPhone } from '../lib/whatsapp'
import Wordmark from './Wordmark'

export default function Footer() {
  const { settings } = useSettings()
  const collections = useCollections()

  const col = (title: string, links: { to: string; label: string }[]) => (
    <div>
      <div className="eyebrow text-rose-light mb-5">{title}</div>
      <ul className="space-y-3 text-sm">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="text-silver-light/80 hover:text-cream transition-colors">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <footer className="bg-noir text-cream mt-auto">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-16 pb-10 grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
        <div className="col-span-2 md:col-span-1">
          <Wordmark tone="rose" className="text-3xl" />
          <p className="text-sm text-silver/80 max-w-xs leading-relaxed mt-5">
            Luxury silver jewellery inspired by Italian, Turkish and Middle Eastern traditions. Made to order in Pakistan.
          </p>
          <a
            href={waLink(settings.whatsapp_number, 'Hello SULTANÉ, I have a question.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-sm text-cream border border-silver/30 px-4 py-2.5 hover:border-rose-light hover:text-rose-light transition-colors"
          >
            <MessageCircle size={15} strokeWidth={1.5} /> WhatsApp {displayPhone(settings.whatsapp_number)}
          </a>
        </div>

        {col('Shop', [
          { to: '/necklaces', label: 'Necklaces' },
          { to: '/earrings', label: 'Earrings' },
          { to: '/bracelets', label: 'Bracelets' },
          { to: '/rings', label: 'Rings' },
          { to: '/mens', label: "Men's" },
          { to: '/premium', label: 'Premium Collection' },
          ...collections.map((c) => ({ to: `/collections/${c.slug}`, label: c.name })),
        ])}

        {col('Client care', [
          { to: '/contact', label: 'Contact us' },
          { to: '/faq', label: 'FAQs' },
          { to: '/track-order', label: 'Track your order' },
          { to: '/care', label: 'Jewellery care' },
          { to: '/custom-jewellery', label: 'Customised jewellery' },
        ])}

        {col('Policies', [
          { to: '/policies/delivery', label: 'Delivery' },
          { to: '/policies/returns', label: 'Returns & defects' },
          { to: '/policies/privacy', label: 'Privacy' },
          { to: '/policies/terms', label: 'Terms of sale' },
          { to: '/about', label: 'The SULTANÉ story' },
        ])}
      </div>

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 pb-10">
        <Link to="/verify" className="flex items-center gap-3 border border-silver/20 px-5 py-4 hover:border-rose-light transition-colors group">
          <ShieldCheck size={20} strokeWidth={1.3} className="text-rose-light shrink-0" />
          <span className="text-sm text-silver-light">
            <span className="text-cream group-hover:text-rose-light">Verify Your Piece</span> — every SULTANÉ purchase carries a unique article number.
          </span>
        </Link>
      </div>

      <div className="border-t border-silver/15">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-silver/60">
          <span>© {new Date().getFullYear()} SULTANÉ. All rights reserved.</span>
          <span>Prices in PKR · Bank transfer · Made to order in Pakistan</span>
        </div>
      </div>
    </footer>
  )
}
