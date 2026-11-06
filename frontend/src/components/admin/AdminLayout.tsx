import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Package, MessagesSquare, Gem, ScanLine, Settings, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/enquiries', label: 'Custom enquiries', icon: MessagesSquare },
  { to: '/admin/catalogue', label: 'Catalogue', icon: Gem },
  { to: '/admin/registry', label: 'Article registry', icon: ScanLine },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ title, crumb, children }: { title: string; crumb: string; children: ReactNode }) {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-cream font-sans">
      <aside className="w-64 shrink-0 bg-maroon text-cream flex flex-col p-6 hidden md:flex">
        <Link to="/" className="font-display text-2xl tracking-[0.18em] mb-1">SULTANÉ</Link>
        <div className="text-[10px] uppercase tracking-[0.14em] text-cream/50 mb-10">The owner&rsquo;s desk</div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-cream text-maroon' : 'text-cream/85 hover:bg-maroon-light'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-cream/15 pt-5 mt-6 text-xs text-cream/60 leading-relaxed">
          <div className="text-cream/90 mb-2">{admin?.name ?? 'Admin'} · {admin?.role ?? 'owner'}</div>
          <p className="mb-3">
            Role concept: Owner / Staff / Viewer. Granular permissions per role are not yet implemented.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/" className="underline">View storefront ↗</Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 underline">
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-line">
          <div className="text-xs text-stone">{crumb}</div>
          <div className="flex items-center gap-4">
            <Bell size={17} strokeWidth={1.5} className="text-stone" />
            <span className="text-xs text-stone">{admin?.email}</span>
          </div>
        </div>
        <div className="px-6 sm:px-10 py-8">
          <h1 className="sr-only">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
