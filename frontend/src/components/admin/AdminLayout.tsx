import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Package, MessagesSquare, Gem, ScanLine, Settings, LogOut, BadgePercent, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Wordmark from '../Wordmark'

const NAV = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/admin/orders', label: 'Orders & payments', icon: Package },
  { to: '/admin/enquiries', label: 'Custom requests', icon: MessagesSquare },
  { to: '/admin/catalogue', label: 'Products', icon: Gem },
  { to: '/admin/registry', label: 'Article registry', icon: ScanLine },
  { to: '/admin/promotions', label: 'Promotions & rewards', icon: BadgePercent },
  { to: '/admin/settings', label: 'Site settings', icon: Settings },
]

export default function AdminLayout({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const sidebar = (
    <>
      <Link to="/admin/overview" className="block mb-1">
        <Wordmark tone="rose" className="text-2xl" />
      </Link>
      <div className="eyebrow text-silver/60 mb-10">Owner dashboard</div>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-cream text-noir' : 'text-silver-light hover:bg-noir-light'}`
            }
          >
            <Icon size={16} strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-silver/15 pt-5 mt-6 text-xs text-silver/70">
        <div className="text-cream mb-1">{admin?.name}</div>
        <div className="mb-4 capitalize">{admin?.role}{admin?.role === 'viewer' ? ' · read-only' : ''}</div>
        <div className="flex items-center gap-4">
          <Link to="/" target="_blank" className="underline">View site ↗</Link>
          <button
            onClick={() => {
              logout()
              navigate('/admin/login')
            }}
            className="flex items-center gap-1.5 underline"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex bg-cream-dark font-sans">
      <aside className="w-64 shrink-0 bg-noir text-cream hidden lg:flex flex-col p-6 sticky top-0 h-screen">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-noir/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-noir text-cream flex flex-col p-6">
            <button onClick={() => setOpen(false)} className="self-end mb-4" aria-label="Close menu"><X size={20} /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-line bg-cream sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
          </div>
          <div className="flex items-center gap-3">{actions}</div>
        </header>
        <div className="px-5 sm:px-8 py-6">{children}</div>
      </div>
    </div>
  )
}
