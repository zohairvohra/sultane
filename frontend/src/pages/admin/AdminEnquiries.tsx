import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { adminGetEnquiries, adminGetEnquiry, adminUpdateEnquiryStatus, ApiError, type ApiEnquiry } from '../../lib/api'

type Status = ApiEnquiry['status']

const STATUS_LABELS: Record<Status, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  accepted: 'Accepted',
  declined: 'Declined',
}

const STATUS_STYLES: Record<Status, string> = {
  new: 'bg-blush text-maroon',
  contacted: 'bg-cream-dark text-ink',
  quoted: 'bg-warn-bg text-maroon',
  accepted: 'bg-success-bg text-success',
  declined: 'bg-cream-dark text-stone',
}

const NEXT_STATUS: Record<Status, Status | null> = {
  new: 'contacted',
  contacted: 'quoted',
  quoted: 'accepted',
  accepted: null,
  declined: null,
}

const titleFor = (en: ApiEnquiry) => (en.type === 'customize' ? `Modify ${en.product_name ?? 'design'}` : en.jewellery_type ?? 'Custom design')

export default function AdminEnquiries() {
  const { token } = useAuth()
  const [enquiries, setEnquiries] = useState<ApiEnquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRef, setSelectedRef] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<(ApiEnquiry & { files: { id: string; url: string; filename: string }[] }) | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All active statuses')

  const loadEnquiries = () => {
    if (!token) return
    setLoading(true)
    adminGetEnquiries(token)
      .then((rows) => {
        setEnquiries(rows)
        if (!selectedRef && rows[0]) setSelectedRef(rows[0].ref)
      })
      .catch(() => setEnquiries([]))
      .finally(() => setLoading(false))
  }

  useEffect(loadEnquiries, [token])

  useEffect(() => {
    if (!token || !selectedRef) return
    adminGetEnquiry(token, selectedRef).then(setSelectedDetail).catch(() => setSelectedDetail(null))
  }, [token, selectedRef])

  const filtered = useMemo(() => {
    return enquiries.filter((en) => {
      if (search && !(`${en.ref} ${en.name} ${en.phone}`.toLowerCase().includes(search.toLowerCase()))) return false
      if (statusFilter !== 'All active statuses' && STATUS_LABELS[en.status] !== statusFilter) return false
      return true
    })
  }, [enquiries, search, statusFilter])

  const counts = {
    New: enquiries.filter((e) => e.status === 'new').length,
    Contacted: enquiries.filter((e) => e.status === 'contacted').length,
    Quoted: enquiries.filter((e) => e.status === 'quoted').length,
    Accepted: enquiries.filter((e) => e.status === 'accepted').length,
  }

  const advance = async () => {
    if (!token || !selectedDetail) return
    const next = NEXT_STATUS[selectedDetail.status]
    if (!next) return
    setBusy(true)
    try {
      await adminUpdateEnquiryStatus(token, selectedDetail.id, { status: next })
      loadEnquiries()
      const refreshed = await adminGetEnquiry(token, selectedDetail.ref)
      setSelectedDetail(refreshed)
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err)
    } finally {
      setBusy(false)
    }
  }

  const waLink = (en: ApiEnquiry) =>
    `https://wa.me/${en.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
      `Hello ${en.name.split(' ')[0]}, this is SULTANÉ regarding your enquiry ${en.ref} (${titleFor(en)}).`,
    )}`

  const selected = selectedDetail

  return (
    <AdminLayout title="Custom enquiries" crumb="Workspace / Custom enquiries">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-2">Private client requests</div>
          <h2 className="font-display text-4xl text-maroon">Ideas, ready for a conversation.</h2>
          <p className="text-stone mt-1 text-sm">Review the brief, make contact, then prepare a quote. A request is not an order.</p>
        </div>
        <span className="bg-cream-dark text-xs px-3 py-1.5 w-fit">Owner view · Private workspace</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="New" value={counts.New} note="Awaiting a first response" />
        <StatTile label="Contacted" value={counts.Contacted} note="Details being discussed" />
        <StatTile label="Quoted" value={counts.Quoted} note="Awaiting a decision" />
        <StatTile label="Accepted" value={counts.Accepted} note="Next steps to confirm" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Reference, name or WhatsApp number"
          className="border border-line bg-cream px-4 py-2.5 text-sm focus:outline-none focus:border-maroon sm:col-span-2"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-line bg-cream px-4 py-2.5 text-sm focus:outline-none focus:border-maroon">
          {['All active statuses', ...Object.values(STATUS_LABELS)].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-8">
        <div className="bg-white border border-line">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h3 className="font-display text-2xl text-maroon">The enquiry desk</h3>
            <span className="text-xs text-stone">{filtered.length} active</span>
          </div>
          <div className="divide-y divide-line max-h-[600px] overflow-y-auto">
            {loading && <div className="px-5 py-10 text-center text-sm text-stone">Loading enquiries…</div>}
            {!loading && filtered.map((en) => (
              <button
                key={en.ref}
                onClick={() => setSelectedRef(en.ref)}
                className={`w-full text-left px-5 py-4 hover:bg-cream-dark/50 transition-colors ${selectedRef === en.ref ? 'bg-blush-light' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] px-2 py-0.5 ${STATUS_STYLES[en.status]}`}>{STATUS_LABELS[en.status]}</span>
                  <span className="text-[10px] text-stone">{new Date(en.created_at).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="font-display text-xl text-ink">{en.name}</div>
                <div className="text-xs text-stone">{en.ref}</div>
                <div className="text-xs text-stone mt-0.5">{titleFor(en)}</div>
              </button>
            ))}
            {!loading && filtered.length === 0 && <div className="px-5 py-10 text-center text-sm text-stone">No enquiries match these filters.</div>}
          </div>
        </div>

        {selected && (
          <div className="bg-white border border-line p-6 sm:p-8">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] uppercase tracking-[0.1em] text-stone">Saved request / {new Date(selected.created_at).toLocaleDateString('en-GB')}</div>
              <span className={`text-[10px] px-2 py-0.5 ${STATUS_STYLES[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
            </div>
            <div className="font-display text-xl text-maroon mb-5">{selected.ref}</div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-3xl text-ink">{selected.name}</h3>
                <p className="text-sm text-stone">{selected.phone}{selected.email ? ` · ${selected.email}` : ''}</p>
              </div>
              <div className="flex gap-3">
                <a href={waLink(selected)} target="_blank" rel="noopener noreferrer" className="border border-maroon text-maroon text-xs uppercase tracking-[0.08em] px-4 py-2.5 hover:bg-maroon hover:text-cream transition-colors">
                  WhatsApp ↗
                </a>
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="border border-line text-ink text-xs uppercase tracking-[0.08em] px-4 py-2.5 hover:border-maroon transition-colors">
                    Email ↗
                  </a>
                )}
              </div>
            </div>

            <h4 className="font-display text-2xl text-maroon mb-4">{titleFor(selected)}</h4>
            <div className="grid sm:grid-cols-3 gap-4 mb-5 text-sm">
              {selected.budget_range && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-stone mb-1">Budget preference</div>
                  <div className="text-ink">PKR {selected.budget_range}</div>
                </div>
              )}
              {selected.size_notes && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-stone mb-1">Size / length</div>
                  <div className="text-ink">{selected.size_notes}</div>
                </div>
              )}
              {selected.purity_preference && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-stone mb-1">Purity preference</div>
                  <div className="text-ink">{selected.purity_preference}</div>
                </div>
              )}
            </div>
            {selected.instructions && <p className="text-sm text-ink leading-relaxed mb-6 italic">&ldquo;{selected.instructions}&rdquo;</p>}

            {selected.files.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={13} className="text-stone" />
                  <span className="text-[11px] uppercase tracking-wide text-stone">Private references / {selected.files.length} files</span>
                  <span className="text-[10px] text-stone ml-auto">Staff-only · Never public</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {selected.files.map((f) => (
                    <a
                      key={f.id}
                      href={`${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}${f.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square bg-cream-dark flex items-center justify-center text-[10px] text-stone px-2 text-center hover:text-maroon"
                    >
                      {f.filename}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {NEXT_STATUS[selected.status] ? (
              <button
                onClick={advance}
                disabled={busy}
                className="bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-5 py-3 hover:bg-maroon-dark transition-colors disabled:opacity-50"
              >
                {busy ? 'Working…' : `Move to "${STATUS_LABELS[NEXT_STATUS[selected.status]!]}" ↗`}
              </button>
            ) : (
              <div className="bg-success-bg text-success text-sm px-4 py-3">This enquiry has been accepted — next step: convert to an order.</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function StatTile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="bg-white border border-line p-5">
      <div className="text-xs text-stone mb-2">{label}</div>
      <div className="font-display text-3xl text-maroon mb-1">{value}</div>
      <div className="text-[11px] text-stone">{note}</div>
    </div>
  )
}
