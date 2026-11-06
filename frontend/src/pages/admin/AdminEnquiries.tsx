import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { AdminButton, Badge, Label, Notice, Panel, inputCls, useAdminAction } from '../../components/admin/ui'
import { useAuth } from '../../context/AuthContext'
import { admin, fetchPrivateBlobUrl, type Row } from '../../lib/api'
import { formatDate, formatPKR, MAJOR_CITIES } from '../../lib/format'
import { waLink, displayPhone } from '../../lib/whatsapp'

const STATUS: Record<string, { label: string; tone: 'warn' | 'rose' | 'neutral' | 'good' | 'bad' }> = {
  new: { label: 'New', tone: 'warn' },
  contacted: { label: 'Contacted', tone: 'rose' },
  quoted: { label: 'Quoted', tone: 'neutral' },
  converted: { label: 'Order created', tone: 'good' },
  declined: { label: 'Declined', tone: 'bad' },
}

function List() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { run, message } = useAdminAction()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => run(() => admin.enquiries(token!, { status, type, search })).then((r) => r && setRows(r)), 250)
    return () => clearTimeout(t)
  }, [token, status, type, search, run])

  return (
    <AdminLayout title="Custom requests">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, product…" className={`${inputCls} max-w-sm`} />
        <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All types</option>
          <option value="customize">Modify existing design</option>
          <option value="new-design">New design</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="bg-cream border border-line divide-y divide-line">
        {rows === null ? (
          <p className="p-8 text-center text-stone">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-stone">No requests.</p>
        ) : (
          rows.map((e) => (
            <button key={e.id} onClick={() => navigate(`/admin/enquiries/${e.ref}`)} className="w-full text-left p-4 hover:bg-blush-light grid sm:grid-cols-[1fr_1.5fr_auto] gap-2 sm:gap-6">
              <div>
                <div className="font-medium text-sm">{e.name}</div>
                <div className="text-xs text-stone">{displayPhone(e.phone)} · {formatDate(e.created_at, true)}</div>
              </div>
              <div className="text-sm">
                <div>{e.type === 'customize' ? `Modify: ${e.product_name}` : `New design${e.jewellery_type ? ` · ${e.jewellery_type}` : ''}`}</div>
                <div className="text-xs text-stone line-clamp-1">{e.description}</div>
              </div>
              <div className="flex items-center gap-2">
                {e.file_count > 0 && <span className="text-xs text-stone">{e.file_count} img</span>}
                <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
              </div>
            </button>
          ))
        )}
      </div>
    </AdminLayout>
  )
}

function PrivateImage({ fileId, name }: { fileId: string; name: string }) {
  const { token } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let u: string | null = null
    fetchPrivateBlobUrl(`/enquiries/files/${fileId}`, token!).then((x) => {
      u = x
      setUrl(x)
    }).catch(() => undefined)
    return () => {
      if (u) URL.revokeObjectURL(u)
    }
  }, [fileId, token])
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block border border-line bg-white">
      <img src={url} alt={name} className="w-full aspect-square object-cover" />
    </a>
  ) : (
    <div className="aspect-square bg-cream-dark animate-pulse" />
  )
}

function Detail({ ref_ }: { ref_: string }) {
  const { token, admin: me } = useAuth()
  const navigate = useNavigate()
  const { run, busy, message, setMessage } = useAdminAction()
  const [e, setE] = useState<Row | null>(null)
  const [quote, setQuote] = useState('')
  const [notes, setNotes] = useState('')
  const [convert, setConvert] = useState({ title: '', details: '', street: '', area: '', city: '', province: '' })
  const readOnly = me?.role === 'viewer'

  const load = useCallback(() => {
    run(() => admin.enquiry(token!, ref_)).then((r) => {
      if (!r) return
      setE(r)
      setQuote(r.quoted_price_pkr?.toString() ?? '')
      setNotes(r.admin_notes ?? '')
      setConvert((c) => ({ ...c, title: c.title || (r.type === 'customize' ? `${r.product_name} — customised` : `Custom ${r.jewellery_type?.toLowerCase().replace(/s$/, '') ?? 'piece'}`), details: c.details || r.description }))
    })
  }, [token, ref_, run])
  useEffect(load, [load])

  if (!e) return <AdminLayout title="Request">{message ? <Notice tone="bad">{message.text}</Notice> : <p className="text-stone">Loading…</p>}</AdminLayout>

  const setStatus = async (status: string) => {
    if (await run(() => admin.updateEnquiry(token!, e.id, { status }), 'Status updated')) load()
  }
  const first = e.name.split(' ')[0]
  const quoteMsg = quote
    ? `Hello ${first}, thank you for your SULTANÉ request ${e.ref}. We can make this for ${formatPKR(Number(quote))}. Would you like to go ahead? If so, please share your delivery address.`
    : `Hello ${first}, thank you for your SULTANÉ request ${e.ref}. `

  return (
    <AdminLayout title={`Request ${e.ref}`} actions={<Link to="/admin/enquiries" className="text-xs text-stone underline">← All requests</Link>}>
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
        <Badge>{e.type === 'customize' ? 'Modify existing design' : 'New design'}</Badge>
        <span className="text-xs text-stone">{formatDate(e.created_at, true)}</span>
      </div>

      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6">
          <Panel title="Request">
            {e.type === 'customize' && (
              <p className="text-sm mb-3">
                Design: <strong>{e.product_name}</strong> <span className="text-stone">({e.product_sku})</span>
              </p>
            )}
            {e.jewellery_type && <p className="text-sm mb-3">Type: {e.jewellery_type}</p>}
            <p className="text-sm whitespace-pre-line">{e.description}</p>
            {e.preferences && <p className="text-sm text-stone mt-3 whitespace-pre-line">Preferences: {e.preferences}</p>}
            {e.files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-5">
                {e.files.map((f: Row) => <PrivateImage key={f.id} fileId={f.id} name={f.filename} />)}
              </div>
            )}
          </Panel>

          {e.status !== 'converted' && !readOnly && (
            <Panel title="Create order from approved quotation">
              <p className="text-xs text-stone mb-4">
                Once the customer has accepted the price on WhatsApp, create their order here. It starts as <em>Pending Price</em>; confirm the amount on the
                order and move it to <em>Awaiting Payment</em> to show them the bank details.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="sm:col-span-2"><Label>Piece name on order</Label><input value={convert.title} onChange={(x) => setConvert({ ...convert, title: x.target.value })} className={inputCls} /></label>
                <label className="sm:col-span-2"><Label>Specification</Label><textarea rows={3} value={convert.details} onChange={(x) => setConvert({ ...convert, details: x.target.value })} className={inputCls} /></label>
                <label className="sm:col-span-2"><Label>Street address</Label><input value={convert.street} onChange={(x) => setConvert({ ...convert, street: x.target.value })} className={inputCls} /></label>
                <label><Label>Area</Label><input value={convert.area} onChange={(x) => setConvert({ ...convert, area: x.target.value })} className={inputCls} /></label>
                <label>
                  <Label>City</Label>
                  <input list="admin-cities" value={convert.city} onChange={(x) => setConvert({ ...convert, city: x.target.value })} className={inputCls} />
                  <datalist id="admin-cities">{MAJOR_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
                </label>
              </div>
              <AdminButton
                className="mt-4"
                disabled={busy || !quote || !convert.street || !convert.city || !convert.title}
                onClick={async () => {
                  const r = await run(() => admin.convertEnquiry(token!, e.id, { ...convert, pricePkr: Number(quote) }))
                  if (r) navigate(`/admin/orders/${r.ref}`)
                }}
              >
                Create order at {quote ? formatPKR(Number(quote)) : '— set a quote first'}
              </AdminButton>
            </Panel>
          )}
          {e.order_ref && <Notice tone="good">Order created: <Link to={`/admin/orders/${e.order_ref}`} className="underline">{e.order_ref}</Link></Notice>}
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <div className="text-sm font-medium">{e.name}</div>
            <a href={waLink(e.phone, quoteMsg)} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-success text-sm">
              <MessageCircle size={15} /> {displayPhone(e.phone)} — open WhatsApp
            </a>
          </Panel>

          <Panel title="Quotation & status">
            <label className="block mb-3">
              <Label hint="Agreed with the jewellery maker">Quoted price (PKR)</Label>
              <input type="number" min={0} value={quote} onChange={(x) => setQuote(x.target.value)} className={inputCls} disabled={readOnly || e.status === 'converted'} />
            </label>
            <label className="block mb-3">
              <Label>Internal notes</Label>
              <textarea rows={4} value={notes} onChange={(x) => setNotes(x.target.value)} className={inputCls} disabled={readOnly} />
            </label>
            {!readOnly && (
              <AdminButton
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  if (await run(() => admin.updateEnquiry(token!, e.id, { quotedPricePkr: quote ? Number(quote) : null, adminNotes: notes, ...(quote && e.status !== 'converted' ? { status: 'quoted' } : {}) }), 'Saved')) load()
                }}
              >
                Save
              </AdminButton>
            )}
            {!readOnly && e.status !== 'converted' && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
                {['contacted', 'quoted', 'declined', 'new'].filter((s) => s !== e.status).map((s) => (
                  <AdminButton key={s} variant={s === 'declined' ? 'danger' : 'ghost'} disabled={busy} onClick={() => setStatus(s)}>
                    Mark {STATUS[s].label.toLowerCase()}
                  </AdminButton>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AdminLayout>
  )
}

export default function AdminEnquiries() {
  const { ref } = useParams()
  return ref ? <Detail key={ref} ref_={ref} /> : <List />
}
