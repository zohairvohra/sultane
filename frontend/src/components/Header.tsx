import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Search, Heart, ShoppingBag, Menu, X } from 'lucide-react'
import { useCart } from '../context/CartContext'

const NAV_LINKS = [
  { to: '/shop', label: 'Shop all' },
  { to: '/collections', label: 'Collections' },
  { to: '/custom-jewellery', label: 'Custom jewellery' },
  { to: '/about', label: 'Our story' },
  { to: '/verify', label: 'Verify an article' },
  { to: '/care', label: 'Care & service' },
]

export default function Header() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-cream">
      <div className="bg-maroon text-cream text-center text-[11px] tracking-[0.12em] uppercase py-2 px-4">
        Silver, with a point of view. <span className="opacity-60">/</span> Pakistan · PKR
      </div>

      <div className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="hidden md:block text-xs tracking-wide text-stone">PAKISTAN / ENGLISH</div>

          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} strokeWidth={1.5} />
          </button>

          <Link to="/" className="font-display text-2xl sm:text-3xl tracking-[0.18em] text-maroon">
            SULTANÉ
          </Link>

          <div className="flex items-center gap-4 sm:gap-5 text-ink">
            <button aria-label="Search" className="hover:text-maroon transition-colors">
              <Search size={19} strokeWidth={1.5} />
            </button>
            <button aria-label="Wishlist" className="hover:text-maroon transition-colors hidden sm:block">
              <Heart size={19} strokeWidth={1.5} />
            </button>
            <Link
              to="/cart"
              className="flex items-center gap-2 hover:text-maroon transition-colors"
              aria-label="Shopping bag"
            >
              <ShoppingBag size={19} strokeWidth={1.5} />
              <span className="hidden sm:inline text-xs tracking-wide">BAG ({count})</span>
            </Link>
          </div>
        </div>

        <nav className="hidden md:flex justify-center gap-8 pb-4 text-sm">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors hover:text-maroon ${isActive ? 'text-maroon' : 'text-ink'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="bg-cream-dark text-center text-[11px] text-stone py-2 px-4">
        Pakistan-wide delivery · Made to order · Bank transfer or cash on delivery
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-cream shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span className="font-display text-xl tracking-[0.18em] text-maroon">SULTANÉ</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex flex-col gap-5 text-base">
              {NAV_LINKS.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="text-ink hover:text-maroon">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-8 border-t border-line flex gap-5 text-stone">
              <Heart size={20} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
