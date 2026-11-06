import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-maroon text-cream mt-auto">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
        <div>
          <div className="font-display text-2xl tracking-[0.18em] mb-4">SULTANÉ</div>
          <p className="text-sm text-cream/70 max-w-xs leading-relaxed">
            Silver jewellery. A considered expression. For the everyday, and the days you remember.
          </p>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-cream/50 mb-4">Discover</div>
          <ul className="space-y-3 text-sm">
            <li><Link to="/shop" className="hover:text-cream/80 text-cream/90">Shop all</Link></li>
            <li><Link to="/collections" className="hover:text-cream/80 text-cream/90">The five collections</Link></li>
            <li><Link to="/custom-jewellery" className="hover:text-cream/80 text-cream/90">Custom jewellery</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-cream/50 mb-4">Client care</div>
          <ul className="space-y-3 text-sm">
            <li><Link to="/care" className="hover:text-cream/80 text-cream/90">Delivery &amp; returns</Link></li>
            <li><Link to="/care" className="hover:text-cream/80 text-cream/90">Jewellery care</Link></li>
            <li><Link to="/care" className="hover:text-cream/80 text-cream/90">Contact support</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-cream/50 mb-4">Your SULTANÉ</div>
          <ul className="space-y-3 text-sm">
            <li><Link to="/verify" className="hover:text-cream/80 text-cream/90">Verify an article</Link></li>
            <li><Link to="/track-order" className="hover:text-cream/80 text-cream/90">Track your order</Link></li>
            <li><Link to="/care" className="hover:text-cream/80 text-cream/90">Privacy &amp; consent</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/15">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-cream/50">
          <span>© 2026 SULTANÉ</span>
          <span>Made to order in Pakistan · Payments verified manually before production</span>
        </div>
      </div>
    </footer>
  )
}
