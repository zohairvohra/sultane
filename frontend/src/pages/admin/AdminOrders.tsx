import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MessageCircle, Printer, FileText, ExternalLink } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { AdminButton, Badge, Notice, Panel, inputCls, useAdminAction, Label } from '../../components/admin/ui'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { admin, fetchPrivateBlobUrl, type Row } from '../../lib/api'
import { formatDate, formatPKR } from '../../lib/format'
import { waLink, displayPhone } from '../../lib/whatsapp'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus, type PaymentStatus } from '../../data/types'

const PAYMENT_TONE: Record<PaymentStatus, 'warn' | 'good' | 'bad' | 'rose'> = {
  awaiting: 'warn',
  'proof-submitted': 'rose',
  verified: 'good',
  flagged: 'bad',
}

// Mirrors the server's transition rules (the server enforces them).
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  'pending-price': ['awaiting-payment', 'cancelled'],
  'awaiting-payment': ['cancelled'],
  'payment-verified': ['in-production', 'cancelled'],
  'in-production': ['quality-check'],
  'quality-check': ['ready-for-dispatch', 'in-production'],
  'ready-for-dispatch': ['dispatched', 'quality-check'],
  dispatched: ['delivered', 'ready-for-dispatch'],
  delivered: [],
  cancelled: [],
}

function statusMessage(o: Row, site: string) {
  const first = o.customer_name.split(' ')[0]
  const track = `${site}/track-order?ref=${o.ref}`
  switch (o.order_status as OrderStatus) {
    case 'awaiting-payment':
      return `Hello ${first}, thank you for your SULTANÉ order ${o.ref}. The amount payable is ${formatPKR(o.total_pkr)}. Bank details are on your order page: ${track}`
    case 'payment-verified':
      return `Hello ${first}, your payment for SULTANÉ order ${o.ref} has been verified. We'll begin making your piece shortly.`
    case 'in-production':
      return `Hello ${first}, your SULTANÉ order ${o.ref} is now being made by our jewellery maker.`
    case 'quality-check':
      return `Hello ${first}, your SULTANÉ order ${o.ref} is in quality check.`
    case 'ready-for-dispatch':
      return `Hello ${first}, your SULTANÉ order ${o.ref} is ready and will be dispatched soon.`
    case 'dispatched':
      return `Hello ${first}, your SULTANÉ order ${o.ref} has been dispatched with ${o.courier_name}. Tracking number: ${o.tracking_number}.${o.tracking_url ? ` Track: ${o.tracking_url}` : ''}`
    case 'delivered':
      return `Hello ${first}, we hope you love your SULTANÉ piece! If anything is wrong, please tell us within 24 hours with photos or a video.`
    default:
      return `Hello ${first}, an update on your SULTANÉ order ${o.ref}: ${ORDER_STATUS_LABELS[o.order_status as OrderStatus]}.`
  }
}

function OrderList() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { run, message } = useAdminAction()
  const [orders, setOrders] = useState<Row[] | null>(null)
  const [search, setSearch] = useState(params.get('search') ?? '')
  const status = params.get('status') ?? ''
  const paymentStatus = params.get('payment') ?? ''

  useEffect(() => {
    const t = setTimeout(() => {
      run(() => admin.orders(token!, { status, paymentStatus, search })).then((r) => r && setOrders(r))
    }, 250)
    return () => clearTimeout(t)
  }, [token, status, paymentStatus, search, run])

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  return (
    <AdminLayout title="Orders & payments">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order no., name, phone, tracking…" className={`${inputCls} max-w-sm`} />
        <select value={status} onChange={(e) => setParam('status', e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => setParam('payment', e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All payments</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-cream border border-line overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-left text-xs text-stone border-b border-line">
            <tr>
              <th className="px-4 py-3 font-normal">Order</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Total</th>
              <th className="px-4 py-3 font-normal">Payment</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders === null ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-stone">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-stone">No orders found.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.ref}`)} className="border-b border-line last:border-0 hover:bg-blush-light cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.ref}</div>
                    <div className="text-xs text-stone">{formatDate(o.created_at, true)} · {o.item_count} pcs</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{o.customer_name}</div>
                    <div className="text-xs text-stone">{displayPhone(o.phone)} · {o.city}</div>
                  </td>
                  <td className="px-4 py-3">{formatPKR(o.total_pkr)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PAYMENT_TONE[o.payment_status as PaymentStatus]}>{PAYMENT_STATUS_LABELS[o.payment_status as PaymentStatus]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={o.order_status === 'cancelled' ? 'bad' : o.order_status === 'delivered' ? 'good' : 'neutral'}>{ORDER_STATUS_LABELS[o.order_status as OrderStatus]}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

function OrderDetail({ ref_ }: { ref_: string }) {
  const { token, admin: me } = useAuth()
  const { settings } = useSettings()
  const { run, busy, message, setMessage } = useAdminAction()
  const [o, setO] = useState<Row | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [flagNote, setFlagNote] = useState('')
  const [courier, setCourier] = useState({ courierName: '', trackingNumber: '', trackingUrl: '', dispatchDate: '' })
  const [notes, setNotes] = useState('')
  const [prices, setPrices] = useState<Record<string, number>>({})
  const readOnly = me?.role === 'viewer'
  const site = window.location.origin

  const load = useCallback(() => {
    run(() => admin.order(token!, ref_)).then((r) => {
      if (!r) return
      setO(r)
      setCourier({ courierName: r.courier_name ?? '', trackingNumber: r.tracking_number ?? '', trackingUrl: r.tracking_url ?? '', dispatchDate: r.dispatch_date?.slice(0, 10) ?? '' })
      setNotes(r.admin_notes ?? '')
      setPrices(Object.fromEntries(r.items.map((i: Row) => [i.id, i.unit_price_pkr])))
    })
  }, [token, ref_, run])

  useEffect(load, [load])

  useEffect(() => {
    if (!o?.has_proof) return
    let url: string | null = null
    fetchPrivateBlobUrl(`/orders/${o.id}/payment-proof`, token!).then((u) => {
      url = u
      setProofUrl(u)
    }).catch(() => setProofUrl(null))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [o?.id, o?.has_proof, o?.proof_uploaded_at, token])

  if (!o) return <AdminLayout title={ref_}>{message ? <Notice tone="bad">{message.text}</Notice> : <p className="text-stone">Loading…</p>}</AdminLayout>

  const status = o.order_status as OrderStatus
  const payment = o.payment_status as PaymentStatus
  const wa = (text: string) => waLink(o.phone, text)

  const verify = async () => {
    if (!confirm(`Confirm you have checked your bank account and received ${formatPKR(o.total_pkr)} for ${o.ref}?\n\nThis generates the article numbers.`)) return
    const r = await run(() => admin.verifyPayment(token!, o.id), (r) => `Payment verified. ${r.articleCodes.length} article number(s) generated.`)
    if (r) load()
  }

  const move = async (to: OrderStatus) => {
    if (to === 'cancelled' && !confirm('Cancel this order? Any article numbers will stop verifying.')) return
    const body = to === 'dispatched' ? { orderStatus: to, ...courier } : { orderStatus: to }
    const r = await run(() => admin.setStatus(token!, o.id, body), `Moved to ${ORDER_STATUS_LABELS[to]}. Send the customer a WhatsApp update below.`)
    if (r) load()
  }

  const articleMessage = `Hello ${o.customer_name.split(' ')[0]}, your SULTANÉ article number${o.articles.length > 1 ? 's' : ''}:\n${o.articles
    .filter((a: Row) => a.status === 'active')
    .map((a: Row) => `• ${a.product_name}: ${a.code}`)
    .join('\n')}\n\nVerify any time at ${site}/verify`

  return (
    <AdminLayout
      title={`Order ${o.ref}`}
      actions={<Link to="/admin/orders" className="text-xs text-stone underline">← All orders</Link>}
    >
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge tone="dark">{ORDER_STATUS_LABELS[status]}</Badge>
        <Badge tone={PAYMENT_TONE[payment]}>{PAYMENT_STATUS_LABELS[payment]}</Badge>
        <span className="text-xs text-stone ml-2">Placed {formatDate(o.created_at, true)}</span>
        {o.enquiry_id && <Badge tone="rose">From custom request</Badge>}
      </div>

      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6">
          {/* Payment */}
          <Panel title="Payment — bank transfer">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-stone">Amount due</span><strong>{formatPKR(o.total_pkr)}</strong></div>
                <div className="flex justify-between"><span className="text-stone">Receipt uploaded</span><span>{o.proof_uploaded_at ? formatDate(o.proof_uploaded_at, true) : 'No'}</span></div>
                {o.verified_at && <div className="flex justify-between"><span className="text-stone">Verified</span><span>{formatDate(o.verified_at, true)}</span></div>}
                {o.payment_note && <div className="text-danger text-xs pt-2">Flag note: {o.payment_note}</div>}
                <p className="text-xs text-stone pt-3">
                  Receipts can arrive here or on WhatsApp. Always confirm the money is in the bank account — uploading a receipt never starts production.
                </p>
              </div>
              <div>
                {o.has_proof ? (
                  proofUrl ? (
                    o.proof_is_pdf ? (
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-line p-4 text-sm hover:border-noir">
                        <FileText size={18} /> Open PDF receipt <ExternalLink size={12} />
                      </a>
                    ) : (
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                        <img src={proofUrl} alt="Payment receipt" className="w-full max-h-72 object-contain border border-line bg-white" />
                      </a>
                    )
                  ) : (
                    <p className="text-xs text-stone">Loading receipt…</p>
                  )
                ) : (
                  <p className="text-xs text-stone border border-dashed border-line p-4">No receipt uploaded on the website.</p>
                )}
              </div>
            </div>
            {!readOnly && payment !== 'verified' && status === 'awaiting-payment' && (
              <div className="flex flex-wrap items-end gap-3 mt-5 pt-5 border-t border-line">
                <AdminButton onClick={verify} disabled={busy}>Mark payment verified</AdminButton>
                <input value={flagNote} onChange={(e) => setFlagNote(e.target.value)} placeholder="Reason, e.g. amount doesn't match" className={`${inputCls} flex-1 min-w-48`} />
                <AdminButton
                  variant="danger"
                  disabled={busy || flagNote.trim().length < 3}
                  onClick={async () => {
                    if (await run(() => admin.flagPayment(token!, o.id, flagNote.trim()), 'Payment flagged for review. Let the customer know on WhatsApp.')) {
                      setFlagNote('')
                      load()
                    }
                  }}
                >
                  Flag for review
                </AdminButton>
              </div>
            )}
            {status === 'pending-price' && <p className="text-xs text-warn mt-4">Finalise the price and move the order to Awaiting Payment before verifying.</p>}
          </Panel>

          {/* Items */}
          <Panel title="Pieces ordered">
            <table className="w-full text-sm">
              <tbody>
                {o.items.map((i: Row) => (
                  <tr key={i.id} className="border-b border-line last:border-0 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{i.product_name}</div>
                      <div className="text-xs text-stone">
                        {i.sku}{i.size ? ` · Size ${i.size}` : ''} · Qty {i.qty}
                        {i.gemstone_testing ? ` · Gemstone testing selected (${formatPKR(i.testing_fee_pkr)}/pc)` : ''}
                        {i.is_custom ? ' · Custom' : ''}
                      </div>
                      {i.custom_details && <p className="text-xs text-stone mt-1 whitespace-pre-line">{i.custom_details}</p>}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {status === 'pending-price' && !readOnly ? (
                        <input
                          type="number"
                          min={0}
                          value={prices[i.id] ?? 0}
                          onChange={(e) => setPrices((p) => ({ ...p, [i.id]: Number(e.target.value) }))}
                          className={`${inputCls} w-32 text-right`}
                        />
                      ) : (
                        formatPKR(i.unit_price_pkr * i.qty)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {status === 'pending-price' && !readOnly && (
              <AdminButton
                variant="outline"
                className="mt-3"
                disabled={busy}
                onClick={async () => {
                  if (await run(() => admin.setPrice(token!, o.id, { lines: Object.entries(prices).map(([id, unitPricePkr]) => ({ id, unitPricePkr })) }), 'Price updated')) load()
                }}
              >
                Save price
              </AdminButton>
            )}
            <dl className="text-sm mt-4 pt-4 border-t border-line space-y-1">
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{formatPKR(o.subtotal_pkr)}</dd></div>
              {o.testing_fees_pkr > 0 && <div className="flex justify-between"><dt className="text-stone">Gemstone testing</dt><dd>{formatPKR(o.testing_fees_pkr)}</dd></div>}
              <div className="flex justify-between"><dt className="text-stone">Delivery ({o.city})</dt><dd>{o.delivery_pkr ? formatPKR(o.delivery_pkr) : 'Free'}</dd></div>
              {o.discount_pkr > 0 && <div className="flex justify-between"><dt className="text-stone">Discount {o.promo_code}</dt><dd>− {formatPKR(o.discount_pkr)}</dd></div>}
              <div className="flex justify-between font-medium pt-1"><dt>Total</dt><dd>{formatPKR(o.total_pkr)}</dd></div>
            </dl>
          </Panel>

          {/* Workflow */}
          <Panel title="Production & delivery">
            {!readOnly && NEXT[status].length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {NEXT[status].map((s) => (
                  <AdminButton key={s} variant={s === 'cancelled' ? 'danger' : s === NEXT[status][0] ? 'primary' : 'outline'} disabled={busy} onClick={() => move(s)}>
                    {s === 'cancelled' ? 'Cancel order' : `→ ${ORDER_STATUS_LABELS[s]}`}
                  </AdminButton>
                ))}
              </div>
            )}
            {status === 'awaiting-payment' && <p className="text-xs text-stone mb-4">Production stages unlock once the payment is verified.</p>}

            <div className="grid sm:grid-cols-2 gap-3">
              <label><Label>Courier company</Label><input value={courier.courierName} onChange={(e) => setCourier({ ...courier, courierName: e.target.value })} placeholder="TCS, Leopards, M&P…" className={inputCls} /></label>
              <label><Label>Tracking number</Label><input value={courier.trackingNumber} onChange={(e) => setCourier({ ...courier, trackingNumber: e.target.value })} className={inputCls} /></label>
              <label><Label>Dispatch date</Label><input type="date" value={courier.dispatchDate} onChange={(e) => setCourier({ ...courier, dispatchDate: e.target.value })} className={inputCls} /></label>
              <label><Label>Tracking link (optional)</Label><input type="url" value={courier.trackingUrl} onChange={(e) => setCourier({ ...courier, trackingUrl: e.target.value })} placeholder="https://" className={inputCls} /></label>
            </div>
            {!readOnly && (
              <AdminButton variant="outline" className="mt-3" disabled={busy} onClick={async () => { if (await run(() => admin.setCourier(token!, o.id, courier), 'Courier details saved')) load() }}>
                Save courier details
              </AdminButton>
            )}
            {status === 'ready-for-dispatch' && <p className="text-xs text-stone mt-3">Courier company and tracking number are required to mark as dispatched.</p>}

            <a href={wa(statusMessage(o, site))} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center gap-2 text-sm text-success">
              <MessageCircle size={15} /> Send “{ORDER_STATUS_LABELS[status]}” update on WhatsApp
            </a>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <div className="text-sm space-y-1">
              <div className="font-medium">{o.customer_name}</div>
              <a href={wa(`Hello ${o.customer_name.split(' ')[0]}, this is SULTANÉ about your order ${o.ref}.`)} target="_blank" rel="noopener noreferrer" className="text-success flex items-center gap-1.5">
                <MessageCircle size={13} /> {displayPhone(o.phone)}
              </a>
              {o.email && <div className="text-stone">{o.email}</div>}
              <div className="text-stone pt-2">
                {o.street}{o.area ? `, ${o.area}` : ''}<br />{o.city}{o.province ? `, ${o.province}` : ''}
              </div>
              {o.delivery_notes && <div className="text-xs bg-cream-dark p-2 mt-2">Note: {o.delivery_notes}</div>}
              <div className="text-xs text-stone pt-2">{o.customer_id ? 'Registered account' : 'Guest checkout'}</div>
            </div>
            {o.history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line">
                <div className="text-xs text-stone mb-2">Other orders from this number</div>
                <ul className="text-xs space-y-1">
                  {o.history.map((h: Row) => (
                    <li key={h.ref} className="flex justify-between">
                      <Link to={`/admin/orders/${h.ref}`} className="underline">{h.ref}</Link>
                      <span className="text-stone">{ORDER_STATUS_LABELS[h.order_status as OrderStatus]} · {formatPKR(h.total_pkr)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel
            title="Article numbers"
            actions={o.articles.length > 0 && <Link to={`/admin/registry?order=${o.ref}`} className="text-xs flex items-center gap-1 underline"><Printer size={12} /> Cards</Link>}
          >
            {o.articles.length === 0 ? (
              <p className="text-xs text-stone">Generated automatically — one per piece — when the payment is verified.</p>
            ) : (
              <>
                <ul className="text-sm space-y-2">
                  {o.articles.map((a: Row) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span className="truncate">{a.product_name}</span>
                      <span className={`font-mono text-xs ${a.status === 'void' ? 'line-through text-stone' : ''}`}>{a.code}</span>
                    </li>
                  ))}
                </ul>
                <a href={wa(articleMessage)} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 text-sm text-success">
                  <MessageCircle size={15} /> Send article numbers on WhatsApp
                </a>
              </>
            )}
          </Panel>

          <Panel title={`${settings.loyalty_percent}% next-order reward`}>
            {o.loyalty_reward ? (
              <div className="text-sm space-y-2">
                <div>Code <strong className="font-mono">{o.loyalty_reward.code}</strong></div>
                <div className="text-xs text-stone">
                  Issued {formatDate(o.loyalty_reward.issued_at)}
                  {o.loyalty_reward.sent_at ? ` · sent ${formatDate(o.loyalty_reward.sent_at)}` : ' · not yet sent'}
                  {o.loyalty_reward.redeemed_at ? ` · redeemed ${formatDate(o.loyalty_reward.redeemed_at)}` : ''}
                </div>
                {!o.loyalty_reward.redeemed_at && (
                  <div className="flex flex-wrap gap-3 items-center">
                    <a
                      href={wa(`Hello ${o.customer_name.split(' ')[0]}, thank you for choosing SULTANÉ! Here is ${settings.loyalty_percent}% off your next order: ${o.loyalty_reward.code}\nEnter it at checkout with this phone number.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => !o.loyalty_reward.sent_at && admin.markLoyaltySent(token!, o.loyalty_reward.code).then(load).catch(() => undefined)}
                      className="flex items-center gap-2 text-success"
                    >
                      <MessageCircle size={15} /> Send on WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ) : status === 'delivered' ? (
              <>
                <p className="text-xs text-stone mb-3">Issued once per customer after their first delivered order. The code works only with this customer's phone number.</p>
                {!readOnly && (
                  <AdminButton disabled={busy} onClick={async () => { if (await run(() => admin.issueLoyalty(token!, o.id), (r) => `Reward ${r.code} issued`)) load() }}>
                    Issue reward code
                  </AdminButton>
                )}
              </>
            ) : (
              <p className="text-xs text-stone">Available once this order is delivered.</p>
            )}
          </Panel>

          <Panel title="Internal notes">
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} disabled={readOnly} placeholder="Only visible to the SULTANÉ team" />
            {!readOnly && <AdminButton variant="outline" className="mt-2" disabled={busy} onClick={() => run(() => admin.setNotes(token!, o.id, notes), 'Notes saved')}>Save notes</AdminButton>}
          </Panel>
        </div>
      </div>
    </AdminLayout>
  )
}

export default function AdminOrders() {
  const { ref } = useParams()
  return ref ? <OrderDetail key={ref} ref_={ref} /> : <OrderList />
}
