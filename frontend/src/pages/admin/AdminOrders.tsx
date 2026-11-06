import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import {
  adminGetOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
  adminVerifyPayment,
  ApiError,
  type ApiOrder,
  type ApiOrderItem,
} from '../../lib/api'
import { formatPKR } from '../../lib/format'

const ORDER_STATUS_LABELS: Record<ApiOrder['order_status'], string> = {
  'pending-confirmation': 'Pending confirmation',
  'awaiting-payment': 'Awaiting payment',
  preparing: 'Preparing',
  'quality-check': 'Quality check',
  'ready-for-dispatch': 'Ready for dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
}

const PAYMENT_STATUS_LABELS: Record<ApiOrder['payment_status'], string> = {
  unpaid: 'Unpaid',
  'pending-review': 'Pending review',
  verified: 'Verified',
}

const STATUS_STYLES: Record<string, string> = {
  'pending-confirmation': 'bg-cream-dark text-ink',
  'awaiting-payment': 'bg-warn-bg text-maroon',
  preparing: 'bg-blush text-maroon',
  'quality-check': 'bg-blush text-maroon',
  'ready-for-dispatch': 'bg-blush text-maroon',
  dispatched: 'bg-success-bg text-success',
  delivered: 'bg-success-bg text-success',
  unpaid: 'bg-warn-bg text-maroon',
  'pending-review': 'bg-warn-bg text-maroon',
  verified: 'bg-success-bg text-success',
}

export default function AdminOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<(ApiOrder & { items: ApiOrderItem[] }) | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [paymentFilter, setPaymentFilter] = useState('All payments')

  const loadOrders = () => {
    if (!token) return
    setLoading(true)
    adminGetOrders(token)
      .then((rows) => {
        setOrders(rows)
        if (!selectedId && rows[0]) setSelectedId(rows[0].id)
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }

  useEffect(loadOrders, [token])

  useEffect(() => {
    if (!token || !selectedId) return
    const ref = orders.find((o) => o.id === selectedId)?.ref
    if (!ref) return
    adminGetOrder(token, ref).then(setSelectedDetail).catch(() => setSelectedDetail(null))
  }, [token, selectedId, orders])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search && !(`${o.ref} ${o.customer_name} ${o.phone}`.toLowerCase().includes(search.toLowerCase()))) return false
      if (statusFilter !== 'All statuses' && ORDER_STATUS_LABELS[o.order_status] !== statusFilter) return false
      if (paymentFilter !== 'All payments' && PAYMENT_STATUS_LABELS[o.payment_status] !== paymentFilter) return false
      return true
    })
  }, [orders, search, statusFilter, paymentFilter])

  const newRequests = orders.filter((o) => o.order_status === 'pending-confirmation').length
  const toConfirm = orders.filter((o) => o.order_status === 'pending-confirmation' || o.order_status === 'awaiting-payment').length
  const codToCollect = orders
    .filter((o) => o.payment_method === 'cod' && o.payment_status === 'unpaid')
    .reduce((s, o) => s + o.total_pkr, 0)
  const transferReview = orders.filter((o) => o.payment_method === 'bank-transfer' && o.payment_status === 'pending-review').length

  const runAction = async (fn: () => Promise<void>) => {
    if (!token) return
    setActionBusy(true)
    setActionNote('')
    try {
      await fn()
      loadOrders()
    } catch (err) {
      setActionNote(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setActionBusy(false)
    }
  }

  const confirmCod = (id: string) =>
    runAction(async () => {
      await adminUpdateOrderStatus(token!, id, { orderStatus: 'preparing' })
    })

  const verifyAndPrepare = (id: string) =>
    runAction(async () => {
      const result = await adminVerifyPayment(token!, id)
      await adminUpdateOrderStatus(token!, id, { orderStatus: 'preparing' })
      setActionNote(`Payment verified. Article code${result.articleCodes.length > 1 ? 's' : ''} generated: ${result.articleCodes.join(', ')}`)
    })

  const markDispatched = (id: string) =>
    runAction(async () => {
      await adminUpdateOrderStatus(token!, id, { orderStatus: 'dispatched' })
    })

  const markDelivered = (id: string) =>
    runAction(async () => {
      await adminUpdateOrderStatus(token!, id, { orderStatus: 'delivered' })
    })

  const selected = selectedDetail

  return (
    <AdminLayout title="Orders" crumb="Workspace / Orders">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h2 className="font-display text-4xl text-maroon">Orders, at a glance.</h2>
          <p className="text-stone mt-1 text-sm">Start with confirmation. Payment and fulfilment are tracked separately.</p>
        </div>
        <button className="border border-maroon text-maroon text-xs uppercase tracking-[0.08em] px-5 py-3 hover:bg-maroon hover:text-cream transition-colors w-fit">
          Export orders ↗
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="New requests" value={String(newRequests)} note="Awaiting first confirmation" />
        <StatTile label="To confirm" value={String(toConfirm)} note="Call before preparing" />
        <StatTile label="COD to collect" value={formatPKR(codToCollect)} note="Unpaid · not revenue" />
        <StatTile label="Transfer review" value={String(transferReview)} note="Check receipt manually" />
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, name or phone"
          className="border border-line bg-cream px-4 py-2.5 text-sm focus:outline-none focus:border-maroon sm:col-span-2"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-line bg-cream px-4 py-2.5 text-sm focus:outline-none focus:border-maroon">
          {['All statuses', ...Object.values(ORDER_STATUS_LABELS)].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="border border-line bg-cream px-4 py-2.5 text-sm focus:outline-none focus:border-maroon">
          {['All payments', ...Object.values(PAYMENT_STATUS_LABELS)].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="bg-white border border-line">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h3 className="font-display text-2xl text-maroon">Recent orders</h3>
            <span className="text-xs text-stone">{filtered.length} of {orders.length} orders</span>
          </div>
          <div className="divide-y divide-line">
            {loading && <div className="px-5 py-10 text-center text-sm text-stone">Loading orders…</div>}
            {!loading && filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={`w-full text-left px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center hover:bg-cream-dark/50 transition-colors ${
                  selectedId === o.id ? 'bg-blush-light' : ''
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-ink">{o.ref}</div>
                  <div className="text-xs text-stone">{o.customer_name}</div>
                  <div className="text-[10px] text-stone/70">{new Date(o.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <div className="text-sm text-ink hidden sm:block">{formatPKR(o.total_pkr)}</div>
                <div>
                  <div className="text-xs text-ink">{o.payment_method === 'cod' ? 'COD' : 'Bank transfer'}</div>
                  <span className={`inline-block text-[10px] px-2 py-0.5 mt-1 ${STATUS_STYLES[o.payment_status]}`}>
                    {PAYMENT_STATUS_LABELS[o.payment_status]}
                  </span>
                </div>
                <div className="text-xs text-ink">{ORDER_STATUS_LABELS[o.order_status]}</div>
              </button>
            ))}
            {!loading && filtered.length === 0 && <div className="px-5 py-10 text-center text-sm text-stone">No orders match these filters.</div>}
          </div>
        </div>

        {selected && (
          <div className="bg-white border border-line p-6 h-fit">
            <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">Selected order</div>
            <h3 className="font-display text-2xl text-ink mb-3">{selected.ref}</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              <span className={`text-xs px-3 py-1 ${STATUS_STYLES[selected.order_status]}`}>{ORDER_STATUS_LABELS[selected.order_status]}</span>
              <span className="text-xs px-3 py-1 bg-cream-dark text-ink">
                {selected.payment_method === 'cod' ? 'COD' : 'Bank transfer'} · {PAYMENT_STATUS_LABELS[selected.payment_status]}
              </span>
            </div>

            {actionNote && <div className="bg-cream-dark text-xs text-ink p-3 mb-5">{actionNote}</div>}

            {selected.order_status === 'pending-confirmation' && selected.payment_method === 'cod' && (
              <ActionBox
                title="Confirm COD before preparing"
                body={`Call ${selected.customer_name} to confirm the pieces, address and ${formatPKR(selected.total_pkr)} due on delivery. Do not mark this order paid or shipped yet.`}
                cta="Mark order confirmed"
                busy={actionBusy}
                onClick={() => confirmCod(selected.id)}
              />
            )}

            {selected.payment_method === 'bank-transfer' && selected.payment_status === 'pending-review' && (
              <ActionBox
                title="Verify bank transfer before production"
                body="Check the uploaded receipt against your bank statement. This generates the article registry codes and unblocks production."
                cta="Mark payment verified"
                busy={actionBusy}
                onClick={() => verifyAndPrepare(selected.id)}
              />
            )}

            {selected.payment_method === 'bank-transfer' && selected.payment_status === 'unpaid' && (
              <div className="bg-warn-bg text-maroon text-xs px-4 py-3 mb-5">
                Awaiting the customer&rsquo;s payment proof before this can be reviewed.
              </div>
            )}

            {selected.order_status === 'preparing' && (
              <ActionBox
                title="Ready to dispatch?"
                body="Once production and quality checks are complete, move this order to Dispatched."
                cta="Mark dispatched"
                busy={actionBusy}
                onClick={() => markDispatched(selected.id)}
              />
            )}

            {selected.order_status === 'dispatched' && (
              <ActionBox
                title="Confirm delivery"
                body="Once the courier confirms delivery, close out this order."
                cta="Mark delivered"
                busy={actionBusy}
                onClick={() => markDelivered(selected.id)}
              />
            )}

            {selected.order_status === 'delivered' && (
              <div className="bg-success-bg text-success text-sm px-4 py-3 mb-5">This order has been delivered.</div>
            )}

            <div className="space-y-4 mt-6 border-t border-line pt-5">
              {selected.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <div className="text-ink">{item.product_name}</div>
                    <div className="text-xs text-stone">
                      {item.collection_slug} · {item.size ? `Size ${item.size}` : item.category} · Qty {item.qty}
                    </div>
                  </div>
                  <div className="text-ink">{formatPKR(item.unit_price_pkr * item.qty)}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-medium border-t border-line mt-4 pt-4">
              <span>Total</span>
              <span>{formatPKR(selected.total_pkr)}</span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-white border border-line p-5">
      <div className="text-xs text-stone mb-2">{label}</div>
      <div className="font-display text-3xl text-maroon mb-1">{value}</div>
      <div className="text-[11px] text-stone">{note}</div>
    </div>
  )
}

function ActionBox({ title, body, cta, busy, onClick }: { title: string; body: string; cta: string; busy: boolean; onClick: () => void }) {
  return (
    <div className="bg-cream-dark p-4 mb-5">
      <div className="text-sm font-medium text-ink mb-1">{title}</div>
      <p className="text-xs text-stone leading-relaxed mb-4">{body}</p>
      <button
        onClick={onClick}
        disabled={busy}
        className="w-full bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-4 py-3 hover:bg-maroon-dark transition-colors disabled:opacity-50"
      >
        {busy ? 'Working…' : `${cta} ↗`}
      </button>
    </div>
  )
}
