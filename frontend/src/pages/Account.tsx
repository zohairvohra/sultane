import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCustomer } from '../context/CustomerContext'
import { getMyOrders, getMyOrder, ApiError } from '../lib/api'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type CustomerOrder, type OrderStatus, type PaymentStatus } from '../data/types'
import { formatDate, formatPKR } from '../lib/format'
import { displayPhone } from '../lib/whatsapp'
import Field from '../components/Field'
import { Button } from '../components/Button'
import OrderView from '../components/OrderView'

function AuthForms() {
  const { login, register } = useCustomer()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(phone, password)
      else await register({ name, phone, email: email || undefined, password })
      const next = params.get('next')
      if (next?.startsWith('/')) navigate(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-5xl text-noir mb-2 text-center">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <p className="text-sm text-stone text-center mb-8">
        An account lets you see your order history. It's optional — you can always check out as a guest and{' '}
        <Link to="/track-order" className="underline">track any order</Link> with your phone number.
      </p>
      <div className="grid grid-cols-2 mb-8 border border-line">
        {(['login', 'register'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`py-3 text-[11px] uppercase tracking-[0.16em] ${mode === m ? 'bg-noir text-cream' : ''}`}>
            {m === 'login' ? 'Sign in' : 'Register'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <Field label="Full name">
            <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" autoComplete="name" />
          </Field>
        )}
        <Field label="Phone number">
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 1234567" className="field" autoComplete="tel" />
        </Field>
        {mode === 'register' && (
          <Field label="Email (optional)">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="email" />
          </Field>
        )}
        <Field label="Password" hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
          <input
            required
            type="password"
            minLength={mode === 'register' ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
        {mode === 'login' && <p className="text-xs text-stone text-center">Forgotten your password? Message us on WhatsApp and we'll help.</p>}
      </form>
    </div>
  )
}

export default function Account() {
  const { customer, token, logout } = useCustomer()
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getMyOrders>> | null>(null)

  useEffect(() => {
    if (!token) return
    getMyOrders(token)
      .then(setOrders)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) logout()
        setOrders([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!customer) return <AuthForms />

  return (
    <div className="mx-auto max-w-[1100px] px-6 sm:px-10 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <div className="eyebrow text-rose-dark mb-2">My account</div>
          <h1 className="font-display text-5xl text-noir">Hello, {customer.name.split(' ')[0]}</h1>
          <p className="text-sm text-stone mt-2">{displayPhone(customer.phone)}{customer.email ? ` · ${customer.email}` : ''}</p>
        </div>
        <button onClick={logout} className="text-xs uppercase tracking-[0.16em] text-stone hover:text-noir">Sign out</button>
      </div>

      <h2 className="font-display text-3xl mb-5">Order history</h2>
      {orders === null ? (
        <p className="text-stone">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-stone">
          No orders on this account yet. Orders placed as a guest can be found on <Link to="/track-order" className="underline">Track your order</Link>.
        </p>
      ) : (
        <div className="border-t border-line">
          {orders.map((o) => (
            <Link key={o.ref} to={`/account/orders/${o.ref}`} className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1.4fr_auto] gap-2 sm:gap-6 py-5 border-b border-line hover:bg-cream-dark px-2 text-sm">
              <div>
                <div className="font-medium">{o.ref}</div>
                <div className="text-xs text-stone">{formatDate(o.created_at)} · {o.item_count} {o.item_count === 1 ? 'piece' : 'pieces'}</div>
              </div>
              <div className="text-right sm:text-left">{formatPKR(o.total_pkr)}</div>
              <div className="text-xs">
                <div>{ORDER_STATUS_LABELS[o.order_status as OrderStatus]}</div>
                <div className="text-stone">{PAYMENT_STATUS_LABELS[o.payment_status as PaymentStatus]}</div>
              </div>
              <div className="text-right text-stone">→</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function AccountOrder() {
  const { ref } = useParams()
  const { token, customer } = useCustomer()
  const [order, setOrder] = useState<CustomerOrder | null | undefined>(undefined)

  useEffect(() => {
    if (!token || !ref) return
    getMyOrder(token, ref).then(setOrder).catch(() => setOrder(null))
  }, [token, ref])

  if (!customer) return <AuthForms />
  if (order === undefined) return <div className="py-24 text-center text-stone">Loading…</div>
  if (order === null) return <div className="py-24 text-center text-stone">Order not found. <Link to="/account" className="underline">Back to account</Link></div>

  return (
    <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-12">
      <Link to="/account" className="text-xs text-stone hover:text-noir">← My orders</Link>
      <h1 className="font-display text-4xl mt-3 mb-8">Order {order.ref}</h1>
      <OrderView order={order} phone={customer.phone} onChange={setOrder} />
    </div>
  )
}
