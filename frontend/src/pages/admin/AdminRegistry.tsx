import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Printer, Pencil, X } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { AdminButton, Badge, Label, Notice, Panel, inputCls, useAdminAction } from '../../components/admin/ui'
import Wordmark from '../../components/Wordmark'
import { useAuth } from '../../context/AuthContext'
import { admin, type Row } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { ORDER_STATUS_LABELS, type OrderStatus } from '../../data/types'

const verifyUrl = (code: string) => `${window.location.origin}/verify/${code}`

// Physical SULTANÉ authenticity card: brand, piece name, article number, QR.
function AuthenticityCard({ record }: { record: Row }) {
  const [qr, setQr] = useState('')
  useEffect(() => {
    QRCode.toDataURL(verifyUrl(record.code), { margin: 0, width: 240, color: { dark: '#141213', light: '#ffffff' } }).then(setQr)
  }, [record.code])
  return (
    <div className="card w-[85.6mm] h-[54mm] bg-white border border-line relative overflow-hidden flex text-noir" style={{ breakInside: 'avoid' }}>
      <div className="absolute top-0 inset-x-0 h-[3px] bg-rosegold" />
      <div className="flex-1 p-4 flex flex-col">
        <Wordmark className="text-lg" />
        <div className="text-[7px] uppercase tracking-[0.2em] text-stone mt-0.5">Certificate of authenticity</div>
        <div className="mt-auto">
          <div className="font-display text-[15px] leading-tight">{record.product_name}</div>
          <div className="text-[7px] uppercase tracking-[0.16em] text-stone mt-2">Article number</div>
          <div className="font-mono text-[11px] tracking-wider">{record.code}</div>
        </div>
      </div>
      <div className="w-[26mm] flex flex-col items-center justify-center pr-3 gap-1">
        {qr && <img src={qr} alt={`QR code for ${record.code}`} className="w-[22mm] h-[22mm]" />}
        <div className="text-[6px] uppercase tracking-[0.14em] text-stone text-center">Scan to verify</div>
      </div>
    </div>
  )
}

export default function AdminRegistry() {
  const { token, admin: me } = useAuth()
  const [params] = useSearchParams()
  const { run, busy, message, setMessage } = useAdminAction()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [search, setSearch] = useState(params.get('order') ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Row | null>(null)
  const [printing, setPrinting] = useState(false)
  const isOwner = me?.role === 'owner'

  const load = () => run(() => admin.articles(token!, search)).then((r) => r && setRows(r))
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, token])

  useEffect(() => {
    // Pre-select an order's pieces when arriving from an order page.
    if (params.get('order') && rows) setSelected(new Set(rows.filter((r) => r.order_ref === params.get('order') && r.status === 'active').map((r) => r.id)))
  }, [rows, params])

  const toPrint = (rows ?? []).filter((r) => selected.has(r.id))

  if (printing) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="no-print flex gap-3 mb-6">
          <AdminButton onClick={() => window.print()}><span className="inline-flex items-center gap-1.5"><Printer size={13} /> Print</span></AdminButton>
          <AdminButton variant="outline" onClick={() => setPrinting(false)}>Back to registry</AdminButton>
          <span className="text-xs text-stone self-center">Cards print at credit-card size (85.6 × 54 mm). Use “Actual size” in the print dialog.</span>
        </div>
        <div className="flex flex-wrap gap-4">
          {toPrint.map((r) => <AuthenticityCard key={r.id} record={r} />)}
        </div>
      </div>
    )
  }

  return (
    <AdminLayout
      title="Article registry"
      actions={
        <AdminButton disabled={!toPrint.length} onClick={() => setPrinting(true)}>
          <span className="inline-flex items-center gap-1.5"><Printer size={13} /> Print {toPrint.length || ''} card{toPrint.length === 1 ? '' : 's'}</span>
        </AdminButton>
      }
    >
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}
      <p className="text-sm text-stone mb-5 max-w-3xl">
        Article numbers are created automatically, one per piece, when you verify an order’s payment. The public verification page shows only the
        customer name, piece name and purchase date below. Voided numbers stop verifying.
      </p>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number, customer, piece or order" className={`${inputCls} max-w-md mb-5`} />

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="bg-cream border border-line overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-xs text-stone border-b border-line">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={!!rows?.length && selected.size === rows.length}
                    onChange={(e) => setSelected(new Set(e.target.checked ? (rows ?? []).map((r) => r.id) : []))}
                  />
                </th>
                <th className="px-3 py-3 font-normal">Article number</th>
                <th className="px-3 py-3 font-normal">Shown publicly</th>
                <th className="px-3 py-3 font-normal">Order</th>
                <th className="px-3 py-3 font-normal">Checks</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr><td colSpan={6} className="p-8 text-center text-stone">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-stone">No records yet — they appear once a payment is verified.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 align-top">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.code}`}
                        checked={selected.has(r.id)}
                        onChange={(e) => {
                          const next = new Set(selected)
                          if (e.target.checked) next.add(r.id)
                          else next.delete(r.id)
                          setSelected(next)
                        }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <a href={verifyUrl(r.code)} target="_blank" rel="noopener noreferrer" className={`font-mono text-xs ${r.status === 'void' ? 'line-through text-stone' : 'underline'}`}>{r.code}</a>
                      <div className="text-[11px] text-stone">Piece {r.piece_index} · {r.sku}{r.size ? ` · ${r.size}` : ''}</div>
                      {r.status === 'void' && <Badge tone="bad">Void</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <div>{r.product_name}</div>
                      <div className="text-xs text-stone">{r.customer_name} · {formatDate(r.purchase_date)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/admin/orders/${r.order_ref}`} className="underline text-xs">{r.order_ref}</Link>
                      <div className="text-[11px] text-stone">{ORDER_STATUS_LABELS[r.order_status as OrderStatus]}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-stone">
                      {r.verification_count}
                      {r.last_verified_at && <div>{formatDate(r.last_verified_at)}</div>}
                    </td>
                    <td className="px-3 py-3">
                      {isOwner && <button onClick={() => setEditing({ ...r, purchase_date: r.purchase_date.slice(0, 10) })} aria-label="Edit record"><Pencil size={14} /></button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editing && (
          <Panel title={`Correct ${editing.code}`} actions={<button onClick={() => setEditing(null)} aria-label="Close"><X size={16} /></button>}>
            <div className="space-y-3">
              <label className="block"><Label>Customer name (public)</Label><input value={editing.customer_name} onChange={(e) => setEditing({ ...editing, customer_name: e.target.value })} className={inputCls} /></label>
              <label className="block"><Label>Jewellery piece name (public)</Label><input value={editing.product_name} onChange={(e) => setEditing({ ...editing, product_name: e.target.value })} className={inputCls} /></label>
              <label className="block"><Label>Purchase date (public)</Label><input type="date" value={editing.purchase_date} onChange={(e) => setEditing({ ...editing, purchase_date: e.target.value })} className={inputCls} /></label>
              <label className="block">
                <Label>Status</Label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className={inputCls}>
                  <option value="active">Active — verifies publicly</option>
                  <option value="void">Void — no longer verifies</option>
                </select>
              </label>
              <label className="block"><Label>Internal note (reason for change)</Label><textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className={inputCls} /></label>
              <AdminButton
                disabled={busy}
                onClick={async () => {
                  const r = await run(
                    () => admin.updateArticle(token!, editing.id, { customerName: editing.customer_name, productName: editing.product_name, purchaseDate: editing.purchase_date, status: editing.status, notes: editing.notes ?? '' }),
                    'Record updated',
                  )
                  if (r) {
                    setEditing(null)
                    load()
                  }
                }}
              >
                Save correction
              </AdminButton>
            </div>
          </Panel>
        )}
      </div>
    </AdminLayout>
  )
}
