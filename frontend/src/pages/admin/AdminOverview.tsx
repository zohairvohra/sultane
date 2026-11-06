import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { Panel, Stat, useAdminAction } from '../../components/admin/ui'
import { useAuth } from '../../context/AuthContext'
import { admin, type Row } from '../../lib/api'
import { formatPKR } from '../../lib/format'
import { ORDER_STATUS_LABELS, type OrderStatus } from '../../data/types'

export default function AdminOverview() {
  const { token } = useAuth()
  const { run, message } = useAdminAction()
  const [data, setData] = useState<Row | null>(null)

  useEffect(() => {
    run(() => admin.summary(token!)).then((d) => d && setData(d))
  }, [token, run])

  return (
    <AdminLayout title="Overview">
      {message && <p className="text-danger text-sm mb-4">{message.text}</p>}
      {!data ? (
        <p className="text-stone">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Verified revenue" value={formatPKR(data.verifiedRevenuePkr)} sub={`${formatPKR(data.verifiedRevenueThisMonthPkr)} this month`} tone="good" />
            <Stat label="Orders submitted" value={data.orders.submitted} sub={`${data.orders.verified} paid & verified · ${data.orders.cancelled} cancelled`} />
            <Stat
              label="Outstanding payments"
              value={formatPKR(data.outstanding.total)}
              sub={`${data.outstanding.count} orders · not counted as revenue`}
              tone={data.outstanding.count ? 'warn' : undefined}
            />
            <Stat label="Receipts to review" value={data.outstanding.proofs_to_review} sub={`${data.outstanding.flagged} flagged`} tone={data.outstanding.proofs_to_review ? 'warn' : undefined} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Awaiting production" value={data.awaitingProduction} sub="Payment verified" />
            <Stat label="In production / QC" value={data.inProduction} />
            <Stat label="Ready for dispatch" value={data.awaitingDispatch} />
            <Stat label="New custom requests" value={data.enquiries.new} sub={`${data.enquiries.total} total`} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Panel title="Orders by status">
              <ul className="text-sm space-y-2">
                {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).filter((s) => s !== 'cancelled').map((s) => (
                  <li key={s} className="flex justify-between">
                    <Link to={`/admin/orders?status=${s}`} className="hover:underline">{ORDER_STATUS_LABELS[s]}</Link>
                    <span>{data.byStatus[s] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Bestselling products (verified orders)">
              {data.bestsellers.length === 0 ? (
                <p className="text-sm text-stone">No verified sales yet.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {data.bestsellers.map((b: Row) => (
                    <li key={b.sku ?? b.product_name} className="flex justify-between gap-3">
                      <span className="truncate">{b.product_name}</span>
                      <span className="text-stone shrink-0">{b.units} · {formatPKR(b.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Promotional code usage">
              <ul className="text-sm space-y-2">
                {data.promoUsage.map((p: Row) => (
                  <li key={p.code} className="flex justify-between gap-3">
                    <span className="truncate">{p.code}{p.kind === 'loyalty' ? ' (reward)' : ''}</span>
                    <span className="text-stone shrink-0">
                      {p.redemption_count}{p.max_redemptions ? `/${p.max_redemptions}` : ''} · −{formatPKR(p.total_discount)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-stone mt-4">Loyalty rewards: {data.loyalty.issued} issued · {data.loyalty.redeemed} redeemed</p>
            </Panel>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
