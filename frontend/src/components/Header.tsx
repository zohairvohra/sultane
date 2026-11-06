import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Search, User, ShoppingBag, Menu, X, ChevronDown, ShieldCheck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import { useCustomer } from '../context/CustomerContext'
import { useCollections } from '../lib/useCollections'
import Wordmark from './Wordmark'

interface NavItem {
  label: string
  to: string
  children?: { label: string; to: string }[]
  accent?: boolean
}

export default function Header() {
  const { count } = useCart()
  const { settings } = useSettings()
  const { customer } = useCustomer()
  const collections = useCollections()
  const location = useLocation()
  const navigate = useNavigate()

  const [drawer, setDrawer] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const nav: NavItem[] = [
    { label: 'Necklaces', to: '/necklaces' },
    { label: 'Earrings', to: '/earrings' },
    { label: 'Bracelets', to: '/bracelets' },
    {
      label: "Men's",
      to: '/mens',
      children: [
        { label: 'Chains', to: '/mens/chains' },
        { label: 'Rings', to: '/mens/rings' },
        { label: 'Bracelets', to: '/mens/bracelets' },
        { label: "All men's jewellery", to: '/mens' },
      ],
    },
    { label: 'Rings', to: '/rings' },
    {
      label: 'Collections',
      to: '/collections',
      children: [...collections.map((c) => ({ label: c.name, to: `/collections/${c.slug}` })), { label: 'All collections', to: '/collections' }],
    },
    { label: 'Premium Collection', to: '/premium', accent: true },
    { label: 'Customized Jewellery', to: '/custom-jewellery' },
    { label: 'About Us', to: '/about' },
  ]

  useEffect(() => {
    setDrawer(false)
    setSearchOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative py-1 transition-colors hover:text-rose-dark after:absolute after:left-0 after:-bottom-0.5 after:h-px after:bg-rose after:transition-all ${
      isActive ? 'text-rose-dark after:w-full' : 'text-ink after:w-0 hover:after:w-full'
    }`

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
      {settings.announcement && (
        <div className="bg-noir text-silver-light text-center text-[10px] sm:text-[11px] tracking-[0.14em] uppercase py-2 px-4">{settings.announcement}</div>
      )}

      <div className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-16 sm:h-20 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-4">
            <button className="lg:hidden -ml-1 p-1" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu size={22} strokeWidth={1.4} />
            </button>
            <Link
              to="/verify"
              className="hidden lg:inline-flex items-center gap-2 border border-rose/60 text-rose-dark px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] hover:bg-rose hover:text-cream transition-colors"
            >
              <ShieldCheck size={14} strokeWidth={1.5} /> Verify Your Piece
            </Link>
          </div>

          <Link to="/" aria-label="SULTANÉ home">
            <Wordmark className="text-2xl sm:text-[2rem]" />
          </Link>

          <div className="flex items-center justify-end gap-3 sm:gap-5 text-ink">
            <button aria-label="Search" onClick={() => setSearchOpen((o) => !o)} className="p-1 hover:text-rose-dark transition-colors">
              <Search size={19} strokeWidth={1.4} />
            </button>
            <Link to="/account" aria-label={customer ? 'My account' : 'Sign in'} className="p-1 hover:text-rose-dark transition-colors hidden sm:block">
              <User size={19} strokeWidth={1.4} />
            </Link>
            <Link to="/cart" className="relative p-1 hover:text-rose-dark transition-colors" aria-label={`Shopping bag, ${count} items`}>
              <ShoppingBag size={19} strokeWidth={1.4} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose text-cream text-[10px] flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        <nav className="hidden lg:flex justify-center gap-7 xl:gap-9 pb-4 text-[13px] tracking-[0.04em]" aria-label="Main">
          {nav.map((item) =>
            item.children ? (
              <div key={item.to} className="relative group">
                <NavLink to={item.to} className={linkCls}>
                  <span className="inline-flex items-center gap-1">
                    {item.label} <ChevronDown size={12} strokeWidth={1.5} className="transition-transform group-hover:rotate-180" />
                  </span>
                </NavLink>
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-200">
                  <div className="bg-cream border border-line shadow-xl shadow-noir/5 min-w-[220px] py-3">
                    {item.children.map((c) => (
                      <Link key={c.to} to={c.to} className="block px-6 py-2.5 text-[13px] text-ink hover:bg-blush-light hover:text-rose-dark transition-colors">
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} className={(s) => `${linkCls(s)} ${item.accent ? '!text-rose-dark' : ''}`}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      </div>

      {searchOpen && (
        <div className="absolute inset-x-0 top-full bg-cream border-b border-line shadow-lg shadow-noir/5">
          <form onSubmit={submitSearch} className="mx-auto max-w-3xl px-4 sm:px-6 py-6 flex items-center gap-3">
            <Search size={18} strokeWidth={1.4} className="text-stone shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search necklaces, rings, emerald…"
              className="flex-1 bg-transparent font-display text-2xl py-2 focus:outline-none"
              aria-label="Search jewellery"
            />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="p-1">
              <X size={20} strokeWidth={1.4} />
            </button>
          </form>
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-noir/50" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full w-[85vw] max-w-sm bg-cream shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 h-16 border-b border-line">
              <Wordmark className="text-xl" />
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="p-1">
                <X size={22} strokeWidth={1.4} />
              </button>
            </div>
            <Link to="/verify" className="mx-6 mt-6 flex items-center justify-center gap-2 bg-rosegold text-noir py-3 text-[11px] uppercase tracking-[0.16em]">
              <ShieldCheck size={15} strokeWidth={1.5} /> Verify Your Piece
            </Link>
            <nav className="flex flex-col px-6 py-4" aria-label="Mobile">
              {nav.map((item) => (
                <div key={item.to} className="border-b border-line">
                  {item.children ? (
                    <>
                      <button
                        onClick={() => setExpanded((e) => (e === item.label ? null : item.label))}
                        className="w-full flex items-center justify-between py-4 text-[15px]"
                        aria-expanded={expanded === item.label}
                      >
                        {item.label}
                        <ChevronDown size={16} strokeWidth={1.4} className={`transition-transform ${expanded === item.label ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded === item.label && (
                        <div className="pb-3 pl-3 flex flex-col">
                          {item.children.map((c) => (
                            <Link key={c.to} to={c.to} className="py-2.5 text-sm text-stone hover:text-rose-dark">
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link to={item.to} className={`block py-4 text-[15px] ${item.accent ? 'text-rose-dark' : ''}`}>
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <div className="mt-auto px-6 py-6 border-t border-line flex flex-col gap-3 text-sm text-stone">
              <Link to="/account" className="flex items-center gap-2"><User size={16} strokeWidth={1.4} /> {customer ? `Hi, ${customer.name.split(' ')[0]}` : 'Sign in / Register'}</Link>
              <Link to="/track-order">Track your order</Link>
              <Link to="/contact">Contact us</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
