import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { AdminButton, Badge, Label, Notice, Panel, inputCls, useAdminAction } from '../../components/admin/ui'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { admin, type Row } from '../../lib/api'
import { useCollections } from '../../lib/useCollections'
import { formatDate, formatPKR } from '../../lib/format'
import { displayPhone } from '../../lib/whatsapp'
import type { Product } from '../../data/types'

interface Form {
  code: string
  description: string
  discountType: 'percent' | 'flat'
  discountValue: string
  minOrderPkr: string
  maxRedemptions: string
  perPhoneLimit: string
  startsAt: string
  expiresAt: string
  active: boolean
  collectionSlugs: string[]
  productIds: string[]
}

const EMPTY: Form = {
  code: '', description: '', discountType: 'percent', discountValue: '', minOrderPkr: '0', maxRedemptions: '', perPhoneLimit: '1',
  startsAt: '', expiresAt: '', active: true, collectionSlugs: [], productIds: [],
}

// datetime-local ⇄ ISO
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
const toIso = (local: string) => (local ? new Date(local).toISOString() : null)

function promoState(p: Row): { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } {
  const now = Date.now()
  if (!p.active) return { label: 'Disabled', tone: 'neutral' }
  if (p.expires_at && new Date(p.expires_at).getTime() <= now) return { label: 'Expired', tone: 'bad' }
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return { label: 'Scheduled', tone: 'warn' }
  if (p.max_redemptions != null && p.redemption_count >= p.max_redemptions) return { label: 'Used up', tone: 'bad' }
  return { label: 'Live', tone: 'good' }
}

export default function AdminPromotions() {
  const { token, admin: me } = useAuth()
  const { settings } = useSettings()
  const collections = useCollections()
  const { run, busy, message, setMessage } = useAdminAction()
  const [promos, setPromos] = useState<Row[] | null>(null)
  const [rewards, setRewards] = useState<Row[]>([])
  const [eligible, setEligible] = useState<Row[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const isOwner = me?.role === 'owner'

  const load = useCallback(() => {
    run(() => admin.promos(token!)).then((r) => r && setPromos(r))
    admin.loyalty(token!).then(setRewards).catch(() => undefined)
    admin.loyaltyEligible(token!).then(setEligible).catch(() => undefined)
  }, [token, run])

  useEffect(() => {
    load()
    admin.products(token!).then(setProducts).catch(() => undefined)
  }, [load, token])

  const edit = (p: Row) => {
    setEditingCode(p.code)
    setForm({
      code: p.code, description: p.description ?? '', discountType: p.discount_type, discountValue: String(p.discount_value),
      minOrderPkr: String(p.min_order_pkr), maxRedemptions: p.max_redemptions?.toString() ?? '', perPhoneLimit: p.per_phone_limit?.toString() ?? '',
      startsAt: toLocal(p.starts_at), expiresAt: toLocal(p.expires_at), active: p.active, collectionSlugs: p.collection_slugs ?? [], productIds: p.product_ids ?? [],
    })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const body = {
      ...(editingCode ? {} : { code: form.code }),
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderPkr: Number(form.minOrderPkr) || 0,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      perPhoneLimit: form.perPhoneLimit ? Number(form.perPhoneLimit) : null,
      startsAt: toIso(form.startsAt),
      expiresAt: toIso(form.expiresAt),
      active: form.active,
      collectionSlugs: form.collectionSlugs,
      productIds: form.productIds,
    }
    const r = await run(() => (editingCode ? admin.updatePromo(token!, editingCode, body) : admin.createPromo(token!, body)), editingCode ? 'Code updated' : 'Code created')
    if (r) {
      setForm(null)
      setEditingCode(null)
      load()
    }
  }

  const campaigns = (promos ?? []).filter((p) => p.kind === 'campaign')
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  return (
    <AdminLayout
      title="Promotions & rewards"
      actions={isOwner && !form && <AdminButton onClick={() => { setEditingCode(null); setForm(EMPTY) }}>New code</AdminButton>}
    >
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      {form && (
        <Panel title={editingCode ? `Edit ${editingCode}` : 'New promotional code'} className="mb-6">
          <form onSubmit={save} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label><Label>Code</Label><input required disabled={!!editingCode} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="EID2026" className={inputCls} /></label>
            <label className="lg:col-span-3"><Label>Description (shown to the customer)</Label><input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Eid launch — 10% off" className={inputCls} /></label>
            <label>
              <Label>Discount type</Label>
              <select value={form.discountType} onChange={(e) => set('discountType', e.target.value as Form['discountType'])} className={inputCls}>
                <option value="percent">Percentage</option>
                <option value="flat">Fixed amount (PKR)</option>
              </select>
            </label>
            <label><Label>{form.discountType === 'percent' ? 'Percent off' : 'Rs. off'}</Label><input required type="number" min={1} max={form.discountType === 'percent' ? 100 : undefined} value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} className={inputCls} /></label>
            <label><Label>Minimum order (PKR)</Label><input type="number" min={0} value={form.minOrderPkr} onChange={(e) => set('minOrderPkr', e.target.value)} className={inputCls} /></label>
            <label><Label hint="Blank = unlimited">Total uses allowed</Label><input type="number" min={1} value={form.maxRedemptions} onChange={(e) => set('maxRedemptions', e.target.value)} className={inputCls} /></label>
            <label><Label hint="Blank = unlimited">Uses per customer phone</Label><input type="number" min={1} value={form.perPhoneLimit} onChange={(e) => set('perPhoneLimit', e.target.value)} className={inputCls} /></label>
            <label><Label>Starts</Label><input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputCls} /></label>
            <label><Label>Ends</Label><input type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} className={inputCls} /></label>
            <label className="flex items-center gap-2 text-sm mt-5"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="accent-noir" /> Active</label>

            <div className="sm:col-span-2">
              <Label hint="Leave everything unticked to apply to the whole order">Applies to collections</Label>
              <div className="flex flex-wrap gap-4">
                {collections.map((c) => (
                  <label key={c.slug} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.collectionSlugs.includes(c.slug)} onChange={(e) => set('collectionSlugs', e.target.checked ? [...form.collectionSlugs, c.slug] : form.collectionSlugs.filter((x) => x !== c.slug))} className="accent-noir" />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="sm:col-span-2">
              <Label hint="Ctrl/Cmd-click to choose several">…or specific products</Label>
              <select multiple value={form.productIds} onChange={(e) => set('productIds', Array.from(e.target.selectedOptions).map((o) => o.value))} className={`${inputCls} h-28`}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </label>

            <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
              <AdminButton type="submit" disabled={busy}>{editingCode ? 'Save' : 'Create code'}</AdminButton>
              <AdminButton type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</AdminButton>
            </div>
          </form>
        </Panel>
      )}

      <Panel title="Campaign codes" className="mb-6">
        {promos === null ? (
          <p className="text-stone text-sm">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-stone text-sm">No campaign codes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-left text-xs text-stone">
                <tr>
                  <th className="py-2 font-normal">Code</th>
                  <th className="py-2 font-normal">Discount</th>
                  <th className="py-2 font-normal">Rules</th>
                  <th className="py-2 font-normal">Used</th>
                  <th className="py-2 font-normal">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((p) => {
                  const s = promoState(p)
                  return (
                    <tr key={p.code} className="border-t border-line align-top">
                      <td className="py-3 pr-3"><div className="font-mono">{p.code}</div><div className="text-xs text-stone">{p.description}</div></td>
                      <td className="py-3 pr-3">{p.discount_type === 'percent' ? `${p.discount_value}%` : formatPKR(p.discount_value)}</td>
                      <td className="py-3 pr-3 text-xs text-stone">
                        {p.min_order_pkr > 0 && <div>Min {formatPKR(p.min_order_pkr)}</div>}
                        {p.per_phone_limit && <div>{p.per_phone_limit}× per customer</div>}
                        {(p.collection_slugs?.length || p.product_ids?.length) ? <div>Selected items only</div> : null}
                        {(p.starts_at || p.expires_at) && <div>{p.starts_at ? formatDate(p.starts_at) : '…'} → {p.expires_at ? formatDate(p.expires_at) : '…'}</div>}
                      </td>
                      <td className="py-3 pr-3">{p.redemption_count}{p.max_redemptions ? ` / ${p.max_redemptions}` : ''}<div className="text-xs text-stone">−{formatPKR(p.total_discount_pkr)}</div></td>
                      <td className="py-3 pr-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {isOwner && (
                          <>
                            <AdminButton variant="ghost" onClick={() => edit(p)}>Edit</AdminButton>
                            <AdminButton variant="ghost" onClick={async () => { if (await run(() => admin.updatePromo(token!, p.code, { active: !p.active }))) load() }}>
                              {p.active ? 'Disable' : 'Enable'}
                            </AdminButton>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid xl:grid-cols-2 gap-6">
        <Panel title={`${settings.loyalty_percent}% next-order rewards issued`}>
          <p className="text-xs text-stone mb-4">
            Issued from an order page once the customer's first order is delivered. Each code works once, only with that customer's phone, and expires after{' '}
            {settings.loyalty_valid_days} days. A customer can never receive it twice.
          </p>
          {rewards.length === 0 ? (
            <p className="text-sm text-stone">None issued yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {rewards.map((r) => (
                <li key={r.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                  <span>
                    <span className="font-mono">{r.code}</span> · {r.customer_name}
                    <span className="block text-xs text-stone">
                      For <Link to={`/admin/orders/${r.issued_for_ref}`} className="underline">{r.issued_for_ref}</Link> · {r.sent_at ? 'sent' : 'not sent'}
                      {r.expires_at ? ` · expires ${formatDate(r.expires_at)}` : ''}
                    </span>
                  </span>
                  {r.redeemed_at ? <Badge tone="good">Redeemed {r.redeemed_ref}</Badge> : <Badge tone="warn">Unused</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Customers ready for a reward">
          {eligible.length === 0 ? (
            <p className="text-sm text-stone">Nobody waiting — rewards become available after a first delivered order.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {eligible.map((e) => (
                <li key={e.id} className="py-2.5 flex justify-between gap-2">
                  <span>{e.customer_name}<span className="block text-xs text-stone">{displayPhone(e.phone)} · delivered {formatDate(e.delivered_at)}</span></span>
                  <Link to={`/admin/orders/${e.ref}`} className="text-xs underline self-center">Issue on {e.ref}</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminLayout>
  )
}
