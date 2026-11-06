import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Trash2, Upload, Plus } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { AdminButton, Badge, Label, Notice, Panel, inputCls, useAdminAction } from '../../components/admin/ui'
import ProductImage from '../../components/ProductImage'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { admin } from '../../lib/api'
import { loadCollections, useCollections } from '../../lib/useCollections'
import { formatPKR } from '../../lib/format'
import { CATEGORIES, type Category, type Product, type ProductStatus } from '../../data/types'

const STATUS_LABEL: Record<ProductStatus, string> = { active: 'Published', paused: 'Sales paused', draft: 'Unpublished (draft)' }
const STATUS_TONE: Record<ProductStatus, 'good' | 'warn' | 'neutral'> = { active: 'good', paused: 'warn', draft: 'neutral' }

function List() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const collections = useCollections()
  const { run, message } = useAdminAction()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    run(() => admin.products(token!)).then((p) => p && setProducts(p))
  }, [token, run])

  const shown = useMemo(
    () =>
      (products ?? []).filter((p) => {
        if (search && !`${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())) return false
        if (filter === 'mens' && !p.isMens) return false
        if (filter === 'premium' && !p.isPremium) return false
        if (filter === 'bestseller' && !p.isBestseller) return false
        if (['active', 'paused', 'draft'].includes(filter) && p.status !== filter) return false
        if (filter.startsWith('c:') && !p.collections.includes(filter.slice(2))) return false
        return true
      }),
    [products, search, filter],
  )

  return (
    <AdminLayout title="Products" actions={<AdminButton onClick={() => navigate('/admin/catalogue/new')}><span className="inline-flex items-center gap-1.5"><Plus size={13} /> Add product</span></AdminButton>}>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or product ID" className={`${inputCls} max-w-xs`} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All products</option>
          <option value="active">Published</option>
          <option value="paused">Sales paused</option>
          <option value="draft">Unpublished</option>
          <option value="bestseller">Bestsellers</option>
          <option value="premium">Premium</option>
          <option value="mens">Men's</option>
          {collections.map((c) => <option key={c.slug} value={`c:${c.slug}`}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {products === null ? (
          <p className="text-stone">Loading…</p>
        ) : (
          shown.map((p) => (
            <Link key={p.id} to={`/admin/catalogue/${p.id}`} className="bg-cream border border-line flex gap-4 p-3 hover:border-noir">
              <ProductImage src={p.images[0]?.url} alt={p.name} category={p.category} className="w-20 h-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{p.name}</div>
                <div className="text-xs text-stone">{p.sku} · {p.category}</div>
                <div className="text-sm mt-1">{formatPKR(p.price)}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  {p.isPremium && <Badge tone="rose">Premium</Badge>}
                  {p.isMens && <Badge tone="dark">Men's</Badge>}
                  {p.images.length === 0 && <Badge tone="warn">No photos</Badge>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </AdminLayout>
  )
}

interface Form {
  name: string
  sku: string
  slug: string
  category: Category
  pricePkr: string
  description: string
  sizes: string
  status: ProductStatus
  productionTime: string
  isBestseller: boolean
  isPremium: boolean
  isMens: boolean
  allowCustomisation: boolean
  purity925: boolean
  materialNote: string
  gemstoneType: string
  gemstoneOrigin: '' | 'natural' | 'lab-created'
  gemstoneDetails: string
  testingAvailable: boolean
  certificationInfo: string
  position: string
  collections: string[]
}

const EMPTY: Form = {
  name: '', sku: '', slug: '', category: 'Necklaces', pricePkr: '', description: '', sizes: '', status: 'draft',
  productionTime: '7–10 working days', isBestseller: false, isPremium: false, isMens: false, allowCustomisation: true,
  purity925: false, materialNote: '', gemstoneType: '', gemstoneOrigin: '', gemstoneDetails: '', testingAvailable: false,
  certificationInfo: '', position: '0', collections: [],
}

function toForm(p: Product): Form {
  return {
    name: p.name, sku: p.sku, slug: p.slug, category: p.category, pricePkr: String(p.price), description: p.description,
    sizes: p.sizes.join(', '), status: p.status, productionTime: p.productionTime, isBestseller: p.isBestseller,
    isPremium: p.isPremium, isMens: p.isMens, allowCustomisation: p.allowCustomisation, purity925: p.purity925,
    materialNote: p.materialNote ?? '', gemstoneType: p.gemstone?.type ?? '', gemstoneOrigin: p.gemstone?.origin ?? '',
    gemstoneDetails: p.gemstone?.details ?? '', testingAvailable: p.testingAvailable, certificationInfo: p.certificationInfo ?? '',
    position: String(p.position), collections: p.collections,
  }
}

function Editor({ id }: { id: string }) {
  const isNew = id === 'new'
  const { token, admin: me } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const collections = useCollections()
  const { run, busy, message, setMessage } = useAdminAction()
  const [product, setProduct] = useState<Product | null>(null)
  const [f, setF] = useState<Form>(EMPTY)
  const fileRef = useRef<HTMLInputElement>(null)
  const readOnly = me?.role === 'viewer'

  useEffect(() => {
    if (isNew) return
    run(() => admin.product(token!, id)).then((p) => {
      if (!p) return
      setProduct(p)
      setF(toForm(p))
    })
  }, [id, isNew, token, run])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const body = {
      name: f.name, sku: f.sku, slug: f.slug || undefined, category: f.category, pricePkr: Number(f.pricePkr), description: f.description,
      sizes: f.sizes.split(',').map((s) => s.trim()).filter(Boolean), status: f.status, productionTime: f.productionTime,
      isBestseller: f.isBestseller, isPremium: f.isPremium, isMens: f.isMens, allowCustomisation: f.allowCustomisation,
      purity925: f.purity925, materialNote: f.materialNote || null, gemstoneType: f.gemstoneType || null,
      gemstoneOrigin: f.gemstoneType && f.gemstoneOrigin ? f.gemstoneOrigin : null, gemstoneDetails: f.gemstoneDetails || null,
      testingAvailable: f.testingAvailable, certificationInfo: f.certificationInfo || null, position: Number(f.position) || 0,
      collections: f.collections,
    }
    const saved = await run(() => (isNew ? admin.createProduct(token!, body) : admin.updateProduct(token!, id, body)), isNew ? 'Product created — now add photographs.' : 'Saved')
    if (!saved) return
    loadCollections(true)
    setProduct(saved)
    setF(toForm(saved))
    if (isNew) navigate(`/admin/catalogue/${saved.id}`, { replace: true })
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length || !product) return
    const p = await run(() => admin.uploadImages(token!, product.id, Array.from(files)), `${files.length} photo(s) uploaded`)
    if (p) setProduct(p)
    if (fileRef.current) fileRef.current.value = ''
  }

  const move = async (index: number, dir: -1 | 1) => {
    if (!product) return
    const ids = product.images.map((i) => i.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    const p = await run(() => admin.reorderImages(token!, product.id, ids))
    if (p) setProduct(p)
  }

  const removeImage = async (imageId: string) => {
    if (!product || !confirm('Delete this photograph?')) return
    const p = await run(() => admin.deleteImage(token!, product.id, imageId))
    if (p) setProduct(p)
  }

  const removeProduct = async () => {
    if (!product || !confirm(`Delete “${product.name}” permanently? Past orders keep their record. To hide it temporarily, set it to Unpublished instead.`)) return
    if (await run(() => admin.deleteProduct(token!, product.id))) navigate('/admin/catalogue')
  }

  if (!isNew && !product) return <AdminLayout title="Product">{message ? <Notice tone="bad">{message.text}</Notice> : <p className="text-stone">Loading…</p>}</AdminLayout>

  const check = (k: keyof Form, label: string, hint?: string) => (
    <label className="flex items-start gap-2.5 text-sm cursor-pointer">
      <input type="checkbox" checked={f[k] as boolean} onChange={(e) => set(k, e.target.checked as never)} className="mt-0.5 accent-noir" />
      <span>{label}{hint && <span className="block text-[11px] text-stone">{hint}</span>}</span>
    </label>
  )

  return (
    <AdminLayout
      title={isNew ? 'New product' : f.name || 'Product'}
      actions={
        <>
          {product && product.status !== 'draft' && <Link to={`/product/${product.slug}`} target="_blank" className="text-xs underline">View on site ↗</Link>}
          <Link to="/admin/catalogue" className="text-xs text-stone underline">← Products</Link>
        </>
      }
    >
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}
      <form onSubmit={save} className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
        <fieldset disabled={readOnly} className="space-y-6 min-w-0">
          <Panel title="Basics">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2"><Label>Product name *</Label><input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></label>
              <label><Label hint="Unique internal identifier">Product ID (SKU) *</Label><input required value={f.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} className={inputCls} /></label>
              <label><Label hint="Leave blank to generate from the name">Web address</Label><input value={f.slug} onChange={(e) => set('slug', e.target.value)} placeholder="e.g. layla-emerald-necklace" className={inputCls} /></label>
              <label>
                <Label>Jewellery type *</Label>
                <select value={f.category} onChange={(e) => set('category', e.target.value as Category)} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label><Label>Price (PKR) *</Label><input required type="number" min={0} value={f.pricePkr} onChange={(e) => set('pricePkr', e.target.value)} className={inputCls} /></label>
              <label className="sm:col-span-2"><Label>Description</Label><textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} className={inputCls} /></label>
              <label><Label hint="Comma separated, e.g. 6, 7, 8 — leave blank if one size">Standard sizes</Label><input value={f.sizes} onChange={(e) => set('sizes', e.target.value)} className={inputCls} /></label>
              <label><Label hint="Shown on the product page">Estimated production time *</Label><input required value={f.productionTime} onChange={(e) => set('productionTime', e.target.value)} className={inputCls} /></label>
            </div>
          </Panel>

          <Panel title="Material">
            <div className="space-y-3">
              {check('purity925', 'Show “925 Sterling Silver” tag', 'Only tick once this design’s silver has been verified as genuine 925.')}
              <label className="block"><Label>Material note (optional)</Label><input value={f.materialNote} onChange={(e) => set('materialNote', e.target.value)} className={inputCls} /></label>
            </div>
          </Panel>

          <Panel title="Gemstone & certification">
            <div className="grid sm:grid-cols-2 gap-4">
              <label><Label hint="Leave blank if there is no gemstone">Gemstone type</Label><input value={f.gemstoneType} onChange={(e) => set('gemstoneType', e.target.value)} placeholder="Emerald, Ruby…" className={inputCls} /></label>
              <label>
                <Label>Natural or laboratory-created</Label>
                <select value={f.gemstoneOrigin} onChange={(e) => set('gemstoneOrigin', e.target.value as Form['gemstoneOrigin'])} className={inputCls} disabled={!f.gemstoneType}>
                  <option value="">Not stated</option>
                  <option value="natural">Natural</option>
                  <option value="lab-created">Laboratory-created</option>
                </select>
              </label>
              <label className="sm:col-span-2"><Label>Gemstone details</Label><input value={f.gemstoneDetails} onChange={(e) => set('gemstoneDetails', e.target.value)} placeholder="Cut, size, colour…" className={inputCls} /></label>
              <div className="sm:col-span-2">
                {check('testingAvailable', `Offer optional gemstone testing (${formatPKR(settings.gemstone_testing_fee_pkr)} per piece)`, 'Premium pieces with a gemstone only. Selected by default for the customer, who can untick it.')}
              </div>
              <label className="sm:col-span-2"><Label hint="Who tests the stone and what documentation is supplied">Testing / certification information</Label><textarea rows={2} value={f.certificationInfo} onChange={(e) => set('certificationInfo', e.target.value)} className={inputCls} /></label>
            </div>
            {f.testingAvailable && (!f.isPremium || !f.gemstoneType) && <p className="text-xs text-warn mt-3">Testing will be switched off on save: it needs “Premium Collection” ticked and a gemstone type.</p>}
          </Panel>
        </fieldset>

        <fieldset disabled={readOnly} className="space-y-6 min-w-0">
          <Panel title="Availability">
            <select value={f.status} onChange={(e) => set('status', e.target.value as ProductStatus)} className={inputCls}>
              <option value="active">Published — available to order</option>
              <option value="paused">Sales paused — visible, cannot be ordered</option>
              <option value="draft">Unpublished — hidden from the website</option>
            </select>
            <p className="text-xs text-stone mt-2">SULTANÉ is made to order, so there is no stock count — pause a design whenever the maker can’t take more orders.</p>
          </Panel>

          <Panel title="Where it appears">
            <div className="space-y-3">
              {check('isBestseller', 'Bestsellers')}
              {check('isPremium', 'Premium Collection', 'Genuine gemstone pieces only')}
              {check('isMens', "Men's Collection")}
              <div className="pt-2 border-t border-line">
                <Label>Cultural collections</Label>
                {collections.map((c) => (
                  <label key={c.slug} className="flex items-center gap-2.5 text-sm py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.collections.includes(c.slug)}
                      onChange={(e) => set('collections', e.target.checked ? [...f.collections, c.slug] : f.collections.filter((x) => x !== c.slug))}
                      className="accent-noir"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              {check('allowCustomisation', 'Show “Customise This Design — Request Price”')}
              <label className="block pt-2"><Label hint="Lower numbers appear first">Display order</Label><input type="number" value={f.position} onChange={(e) => set('position', e.target.value)} className={inputCls} /></label>
            </div>
          </Panel>

          <Panel title="Photographs">
            {!product ? (
              <p className="text-xs text-stone">Save the product first, then add photographs.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((img, i) => (
                    <div key={img.id} className="relative group">
                      <ProductImage src={img.url} alt="" className="aspect-square w-full" />
                      {i === 0 && <span className="absolute top-1 left-1 bg-noir text-cream text-[9px] px-1.5 py-0.5">MAIN</span>}
                      {!readOnly && (
                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-noir/70 text-cream p-1 opacity-100 sm:opacity-0 group-hover:opacity-100">
                          <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier"><ArrowLeft size={14} /></button>
                          <button type="button" onClick={() => removeImage(img.id)} aria-label="Delete photo"><Trash2 size={14} /></button>
                          <button type="button" onClick={() => move(i, 1)} aria-label="Move later"><ArrowRight size={14} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!readOnly && (
                  <>
                    <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => upload(e.target.files)} />
                    <AdminButton type="button" variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
                      <span className="inline-flex items-center gap-1.5"><Upload size={13} /> Upload photographs</span>
                    </AdminButton>
                    <p className="text-[11px] text-stone mt-2">JPG, PNG or WebP up to 10 MB. Square or 4:5 photos look best. The first photo is the main image.</p>
                  </>
                )}
              </>
            )}
          </Panel>

          {!readOnly && (
            <div className="flex flex-wrap gap-3 justify-between">
              <AdminButton type="submit" disabled={busy}>{isNew ? 'Create product' : 'Save changes'}</AdminButton>
              {product && me?.role === 'owner' && <AdminButton type="button" variant="danger" onClick={removeProduct}>Delete</AdminButton>}
            </div>
          )}
        </fieldset>
      </form>
    </AdminLayout>
  )
}

export default function AdminCatalogue() {
  const { id } = useParams()
  return id ? <Editor key={id} id={id} /> : <List />
}
