import { useEffect, useState, type ReactNode } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { AdminButton, Label, Notice, Panel, inputCls, useAdminAction } from '../../components/admin/ui'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { admin, adminChangePassword, assetUrl } from '../../lib/api'
import { loadCollections } from '../../lib/useCollections'
import type { Collection, Faq, SiteSettings } from '../../data/types'

const TABS = ['Store', 'Homepage', 'Collections', 'Story & FAQs', 'Policies', 'Account'] as const

export default function AdminSettings() {
  const { token, admin: me } = useAuth()
  const { settings, refresh } = useSettings()
  const { run, busy, message, setMessage } = useAdminAction()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Store')
  const [s, setS] = useState<SiteSettings>(settings)
  const [collections, setCollections] = useState<Collection[]>([])
  const [newCollection, setNewCollection] = useState({ name: '', tagline: '', description: '' })
  const [pw, setPw] = useState({ current: '', next: '' })
  const isOwner = me?.role === 'owner'

  useEffect(() => setS(settings), [settings])
  useEffect(() => {
    loadCollections(true).then(setCollections)
  }, [])

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((x) => ({ ...x, [k]: v }))

  const save = async (keys: (keyof SiteSettings)[]) => {
    const ok = await run(async () => {
      for (const k of keys) await admin.saveSetting(token!, k, s[k])
      return true
    }, 'Saved — the website is updated.')
    if (ok) refresh()
  }

  const upload = async (key: 'hero_video_url' | 'hero_poster_url', file?: File) => {
    if (!file) return
    const r = await run(() => admin.uploadMedia(token!, key, file), key === 'hero_video_url' ? 'Hero video uploaded' : 'Fallback image uploaded')
    if (r) {
      set(key, r.value)
      refresh()
    }
  }

  const saveBtn = (keys: (keyof SiteSettings)[], children: ReactNode = 'Save') =>
    isOwner ? <AdminButton className="mt-4" disabled={busy} onClick={() => save(keys)}>{children}</AdminButton> : null

  const num = (k: keyof SiteSettings) => (
    <input type="number" min={0} value={Number(s[k])} onChange={(e) => set(k, Number(e.target.value) as never)} className={inputCls} />
  )

  const moveFaq = (i: number, d: -1 | 1) => {
    const f = [...s.faqs]
    const j = i + d
    if (j < 0 || j >= f.length) return
    ;[f[i], f[j]] = [f[j], f[i]]
    set('faqs', f)
  }

  return (
    <AdminLayout title="Site settings">
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}
      {!isOwner && <Notice tone="warn">Only the owner account can change site settings.</Notice>}

      <div className="flex flex-wrap gap-1 mb-6 border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm -mb-px border-b-2 ${tab === t ? 'border-noir' : 'border-transparent text-stone'}`}>
            {t}
          </button>
        ))}
      </div>

      <fieldset disabled={!isOwner} className="min-w-0">
        {tab === 'Store' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="WhatsApp">
              <label className="block">
                <Label hint="International format without + or spaces, e.g. 923001234567">WhatsApp number</Label>
                <input value={s.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value.replace(/\D/g, ''))} className={inputCls} />
              </label>
              {saveBtn(['whatsapp_number'])}
            </Panel>

            <Panel title="Bank transfer details (shown to customers awaiting payment)">
              <div className="grid sm:grid-cols-2 gap-3">
                {(['bankName', 'accountTitle', 'accountNumber', 'iban'] as const).map((k) => (
                  <label key={k} className="block">
                    <Label>{{ bankName: 'Bank name', accountTitle: 'Account title', accountNumber: 'Account number', iban: 'IBAN' }[k]}</Label>
                    <input value={s.bank_details[k]} onChange={(e) => set('bank_details', { ...s.bank_details, [k]: e.target.value })} className={inputCls} />
                  </label>
                ))}
              </div>
              {saveBtn(['bank_details'])}
            </Panel>

            <Panel title="Delivery charges & fees">
              <div className="grid sm:grid-cols-3 gap-3">
                <label><Label>Within Karachi (PKR)</Label>{num('delivery_fee_karachi_pkr')}</label>
                <label><Label>Elsewhere in Pakistan (PKR)</Label>{num('delivery_fee_other_pkr')}</label>
                <label><Label>Gemstone testing (PKR / piece)</Label>{num('gemstone_testing_fee_pkr')}</label>
              </div>
              <p className="text-xs text-stone mt-2">Changes apply to new orders immediately; existing orders keep the amounts they were placed with.</p>
              {saveBtn(['delivery_fee_karachi_pkr', 'delivery_fee_other_pkr', 'gemstone_testing_fee_pkr'])}
            </Panel>

            <Panel title="Loyalty reward">
              <div className="grid sm:grid-cols-2 gap-3">
                <label><Label>Next-order discount (%)</Label>{num('loyalty_percent')}</label>
                <label><Label>Valid for (days)</Label>{num('loyalty_valid_days')}</label>
              </div>
              {saveBtn(['loyalty_percent', 'loyalty_valid_days'])}
            </Panel>
          </div>
        )}

        {tab === 'Homepage' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="Hero video">
              {s.hero_video_url ? (
                <video src={assetUrl(s.hero_video_url)} muted loop autoPlay playsInline className="w-full aspect-video object-cover bg-noir mb-3" />
              ) : (
                <p className="text-sm text-stone mb-3">No video set — the fallback image is shown.</p>
              )}
              <label className="block mb-3">
                <Label hint="MP4 (H.264) or WebM, ideally under 8 MB, 1920px wide">Upload the 7-second SULTANÉ video</Label>
                <input type="file" accept="video/mp4,video/webm" onChange={(e) => upload('hero_video_url', e.target.files?.[0])} className="text-sm" />
              </label>
              <label className="block">
                <Label>…or video address</Label>
                <input value={s.hero_video_url} onChange={(e) => set('hero_video_url', e.target.value)} className={inputCls} />
              </label>
              {saveBtn(['hero_video_url'])}
            </Panel>

            <Panel title="Fallback image">
              {s.hero_poster_url && <img src={assetUrl(s.hero_poster_url)} alt="" className="w-full aspect-video object-cover mb-3" />}
              <p className="text-xs text-stone mb-3">Shown while the video loads, on very slow connections, and if the video can't play. Use a still from the video.</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload('hero_poster_url', e.target.files?.[0])} className="text-sm" />
            </Panel>

            <Panel title="Announcement bar" className="lg:col-span-2">
              <input value={s.announcement} onChange={(e) => set('announcement', e.target.value)} className={inputCls} placeholder="Leave empty to hide" />
              {saveBtn(['announcement'])}
            </Panel>
          </div>
        )}

        {tab === 'Collections' && (
          <div className="space-y-6">
            {collections.map((c, i) => (
              <Panel key={c.slug} title={c.name}>
                <div className="grid md:grid-cols-[200px_1fr] gap-5">
                  <div>
                    {c.imageUrl ? <img src={assetUrl(c.imageUrl)} alt="" className="w-full aspect-[3/4] object-cover" /> : <div className="w-full aspect-[3/4] bg-cream-dark flex items-center justify-center text-xs text-stone">No image</div>}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="text-xs mt-2 w-full"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (f && (await run(() => admin.uploadCollectionImage(token!, c.slug, f), 'Image updated'))) setCollections(await loadCollections(true))
                      }}
                    />
                  </div>
                  <div className="grid gap-3">
                    <label><Label>Name</Label><input value={c.name} onChange={(e) => setCollections((cs) => cs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} /></label>
                    <label><Label>Tagline</Label><input value={c.tagline} onChange={(e) => setCollections((cs) => cs.map((x, j) => (j === i ? { ...x, tagline: e.target.value } : x)))} className={inputCls} /></label>
                    <label><Label>Description</Label><textarea rows={3} value={c.description} onChange={(e) => setCollections((cs) => cs.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className={inputCls} /></label>
                    <div className="flex gap-3 items-center">
                      <label className="w-28"><Label>Order</Label><input type="number" value={c.position} onChange={(e) => setCollections((cs) => cs.map((x, j) => (j === i ? { ...x, position: Number(e.target.value) } : x)))} className={inputCls} /></label>
                      {isOwner && (
                        <>
                          <AdminButton className="mt-5" disabled={busy} onClick={async () => { if (await run(() => admin.updateCollection(token!, c.slug, { name: c.name, tagline: c.tagline, description: c.description, position: c.position }), 'Collection saved')) loadCollections(true) }}>
                            Save
                          </AdminButton>
                          <AdminButton
                            variant="danger"
                            className="mt-5"
                            onClick={async () => {
                              if (!confirm(`Delete the ${c.name} collection? Products stay in the catalogue but lose this membership.`)) return
                              if (await run(() => admin.deleteCollection(token!, c.slug), 'Collection deleted')) setCollections(await loadCollections(true))
                            }}
                          >
                            Delete
                          </AdminButton>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-stone">{c.productCount} products · assign products from each product's page.</p>
                  </div>
                </div>
              </Panel>
            ))}
            {isOwner && (
              <Panel title="Add a collection">
                <div className="grid md:grid-cols-3 gap-3">
                  <input value={newCollection.name} onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })} placeholder="Name" className={inputCls} />
                  <input value={newCollection.tagline} onChange={(e) => setNewCollection({ ...newCollection, tagline: e.target.value })} placeholder="Tagline" className={inputCls} />
                  <input value={newCollection.description} onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })} placeholder="Description" className={inputCls} />
                </div>
                <AdminButton
                  className="mt-3"
                  disabled={busy || !newCollection.name}
                  onClick={async () => {
                    if (await run(() => admin.createCollection(token!, { ...newCollection, position: collections.length + 1 }), 'Collection added')) {
                      setNewCollection({ name: '', tagline: '', description: '' })
                      setCollections(await loadCollections(true))
                    }
                  }}
                >
                  Add collection
                </AdminButton>
              </Panel>
            )}
          </div>
        )}

        {tab === 'Story & FAQs' && (
          <div className="space-y-6">
            <Panel title="The SULTANÉ Story (About Us & homepage)">
              <textarea rows={10} value={s.about_story} onChange={(e) => set('about_story', e.target.value)} className={inputCls} />
              <p className="text-xs text-stone mt-1">Leave a blank line between paragraphs. The first paragraph appears on the homepage.</p>
              {saveBtn(['about_story'])}
            </Panel>
            <Panel title="Frequently asked questions">
              <div className="space-y-4">
                {s.faqs.map((f: Faq, i) => (
                  <div key={i} className="border border-line p-3 grid gap-2">
                    <div className="flex gap-2">
                      <input value={f.q} onChange={(e) => set('faqs', s.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder="Question" className={`${inputCls} font-medium`} />
                      <button type="button" onClick={() => moveFaq(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
                      <button type="button" onClick={() => moveFaq(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
                      <button type="button" onClick={() => set('faqs', s.faqs.filter((_, j) => j !== i))} aria-label="Delete question" className="text-danger"><Trash2 size={15} /></button>
                    </div>
                    <textarea rows={2} value={f.a} onChange={(e) => set('faqs', s.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} placeholder="Answer" className={inputCls} />
                  </div>
                ))}
              </div>
              <AdminButton type="button" variant="outline" className="mt-4" onClick={() => set('faqs', [...s.faqs, { q: '', a: '' }])}>
                <span className="inline-flex items-center gap-1.5"><Plus size={13} /> Add question</span>
              </AdminButton>
              <div>{saveBtn(['faqs'], 'Save FAQs')}</div>
            </Panel>
          </div>
        )}

        {tab === 'Policies' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {([
              ['policy_delivery', 'Delivery policy'],
              ['policy_returns', 'Returns & defective items'],
              ['policy_privacy', 'Privacy policy'],
              ['policy_terms', 'Terms of sale'],
            ] as const).map(([k, label]) => (
              <Panel key={k} title={label}>
                <textarea rows={12} value={s[k]} onChange={(e) => set(k, e.target.value)} className={inputCls} />
                <p className="text-xs text-stone mt-1">Plain text. Blank line = new paragraph; start a line with “•” for a bullet.</p>
                {saveBtn([k])}
              </Panel>
            ))}
          </div>
        )}
      </fieldset>

      {tab === 'Account' && (
        <Panel title="Change your password" className="max-w-md">
          <div className="space-y-3">
            <label className="block"><Label>Current password</Label><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={inputCls} autoComplete="current-password" /></label>
            <label className="block"><Label hint="At least 10 characters">New password</Label><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={inputCls} autoComplete="new-password" /></label>
            <AdminButton
              disabled={busy || !pw.current || pw.next.length < 10}
              onClick={async () => {
                if (await run(() => adminChangePassword(token!, pw.current, pw.next), 'Password changed')) setPw({ current: '', next: '' })
              }}
            >
              Change password
            </AdminButton>
          </div>
        </Panel>
      )}
    </AdminLayout>
  )
}
