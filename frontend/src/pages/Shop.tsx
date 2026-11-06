import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import ProductCard from '../components/ProductCard'
import { getProducts, getGemstoneTypes, assetUrl } from '../lib/api'
import { useCollections } from '../lib/useCollections'
import { CATEGORIES, type Category, type Product } from '../data/types'

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'newest'

interface Preset {
  category?: Category
  mens?: boolean
  premium?: boolean
  collection?: string
}

interface ListingProps {
  preset?: Preset
  eyebrow?: string
  title: string
  description?: ReactNode
  tone?: 'blush' | 'noir' | 'silver'
  image?: string | null
  categories?: Category[]
}

// One listing page powers Shop all, each jewellery type, Men's, Premium,
// the cultural collections and search. Filters: type, collection, gemstone.
export function Listing({ preset = {}, eyebrow, title, description, tone, image, categories = CATEGORIES }: ListingProps) {
  const [params, setParams] = useSearchParams()
  const collections = useCollections()
  const q = params.get('q') ?? ''

  const [all, setAll] = useState<Product[] | null>(null)
  const [gemstones, setGemstones] = useState<string[]>([])
  const [drawer, setDrawer] = useState(false)

  const typeFilter = new Set((params.get('type') ?? '').split(',').filter(Boolean))
  const collectionFilter = new Set((params.get('collection') ?? '').split(',').filter(Boolean))
  const gemFilter = new Set((params.get('gemstone') ?? '').split(',').filter(Boolean))
  const sort = (params.get('sort') as Sort) || 'featured'

  useEffect(() => {
    setAll(null)
    getProducts({
      category: preset.category,
      mens: preset.mens ? '1' : undefined,
      premium: preset.premium ? '1' : undefined,
      collection: preset.collection,
      q: q || undefined,
    })
      .then(setAll)
      .catch(() => setAll([]))
  }, [preset.category, preset.mens, preset.premium, preset.collection, q])

  useEffect(() => {
    getGemstoneTypes().then(setGemstones).catch(() => setGemstones([]))
  }, [])

  const setFilter = (key: string, values: Set<string>) => {
    const next = new URLSearchParams(params)
    if (values.size) next.set(key, [...values].join(','))
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const toggle = (key: string, set: Set<string>, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setFilter(key, next)
  }
  const clearAll = () => {
    const next = new URLSearchParams()
    if (q) next.set('q', q)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    let list = (all ?? []).filter((p) => {
      if (typeFilter.size && !typeFilter.has(p.category)) return false
      if (collectionFilter.size && !p.collections.some((c) => collectionFilter.has(c))) return false
      if (gemFilter.size) {
        const g = p.gemstone?.type ?? 'none'
        if (!(gemFilter.has(g) || (gemFilter.has('any') && p.gemstone))) return false
      }
      return true
    })
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, params])

  const activeCount = typeFilter.size + collectionFilter.size + gemFilter.size
  const showTypeFilter = !preset.category && categories.length > 1
  const showCollectionFilter = !preset.collection

  const Check = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center gap-3 text-sm cursor-pointer py-1">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-noir w-4 h-4" />
      {label}
    </label>
  )

  const filters = (
    <div className="space-y-8">
      {showTypeFilter && (
        <fieldset>
          <legend className="eyebrow text-stone mb-3">Jewellery type</legend>
          {categories.map((c) => <Check key={c} label={c} checked={typeFilter.has(c)} onChange={() => toggle('type', typeFilter, c)} />)}
        </fieldset>
      )}
      {showCollectionFilter && collections.length > 0 && (
        <fieldset>
          <legend className="eyebrow text-stone mb-3">Collection</legend>
          {collections.map((c) => (
            <Check key={c.slug} label={c.name} checked={collectionFilter.has(c.slug)} onChange={() => toggle('collection', collectionFilter, c.slug)} />
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend className="eyebrow text-stone mb-3">Gemstone</legend>
        <Check label="Any gemstone" checked={gemFilter.has('any')} onChange={() => toggle('gemstone', gemFilter, 'any')} />
        {gemstones.map((g) => <Check key={g} label={g} checked={gemFilter.has(g)} onChange={() => toggle('gemstone', gemFilter, g)} />)}
        {!preset.premium && <Check label="No gemstone" checked={gemFilter.has('none')} onChange={() => toggle('gemstone', gemFilter, 'none')} />}
      </fieldset>
      {activeCount > 0 && (
        <button onClick={clearAll} className="text-xs uppercase tracking-[0.14em] text-rose-dark underline underline-offset-4">
          Clear filters ({activeCount})
        </button>
      )}
    </div>
  )

  return (
    <div>
      <PageBanner
        eyebrow={eyebrow}
        title={q ? `Results for “${q}”` : title}
        description={q ? undefined : description}
        tone={tone}
        image={image ? assetUrl(image) : undefined}
      />

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-10">
        <div className="flex items-center justify-between gap-4 mb-8 text-sm">
          <button onClick={() => setDrawer(true)} className="lg:hidden inline-flex items-center gap-2 border border-line px-4 py-2.5">
            <SlidersHorizontal size={15} strokeWidth={1.4} /> Filter{activeCount ? ` (${activeCount})` : ''}
          </button>
          <span className="hidden lg:block text-stone">{all ? `${filtered.length} ${filtered.length === 1 ? 'piece' : 'pieces'}` : ''}</span>
          <label className="flex items-center gap-2">
            <span className="sr-only">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                next.set('sort', e.target.value)
                setParams(next, { replace: true })
              }}
              className="border border-line bg-cream px-3 py-2.5 text-sm focus:outline-none focus:border-noir"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-10">
          <aside className="hidden lg:block">{filters}</aside>

          <div>
            {all === null ? (
              <div className="py-24 text-center text-stone">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center text-stone">
                <p className="mb-4">No pieces match {q ? 'your search' : 'these filters'} yet.</p>
                {activeCount > 0 ? (
                  <button onClick={clearAll} className="text-rose-dark underline underline-offset-4">Clear filters</button>
                ) : (
                  <Link to="/custom-jewellery" className="text-rose-dark underline underline-offset-4">Ask us to create it for you</Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-12">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-noir/50" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-[85vw] max-w-sm bg-cream p-6 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span className="font-display text-2xl">Filter</span>
              <button onClick={() => setDrawer(false)} aria-label="Close filters"><X size={22} strokeWidth={1.4} /></button>
            </div>
            {filters}
            <button onClick={() => setDrawer(false)} className="mt-auto bg-noir text-cream py-4 text-[11px] uppercase tracking-[0.16em]">
              Show {filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Shop() {
  return <Listing eyebrow="SULTANÉ" title="All Jewellery" description="Every design is made to order in silver once your payment is verified." />
}

const CATEGORY_SLUGS: Record<string, Category> = { necklaces: 'Necklaces', earrings: 'Earrings', bracelets: 'Bracelets', rings: 'Rings', chains: 'Chains', pendants: 'Pendants' }

export function CategoryPage({ category }: { category: Category }) {
  const copy: Partial<Record<Category, string>> = {
    Necklaces: 'Pendants, collars and statement necklaces in silver.',
    Earrings: 'Studs, hoops and drops — from everyday to occasion.',
    Bracelets: 'Cuffs, links and chains for the wrist.',
    Rings: 'Sculpted bands, signets and gemstone rings.',
  }
  return <Listing preset={{ category }} eyebrow="Shop" title={category} description={copy[category]} />
}

export function MensPage() {
  const { category } = useParams()
  const cat = category ? CATEGORY_SLUGS[category] : undefined
  return (
    <Listing
      key={cat ?? 'all'}
      preset={{ mens: true, category: cat }}
      eyebrow="The Men's Collection"
      title={cat ? `Men's ${cat}` : "Men's Jewellery"}
      description="Chains, rings and bracelets with weight and presence."
      tone="noir"
      categories={['Chains', 'Rings', 'Bracelets']}
    />
  )
}

export function PremiumPage() {
  return (
    <Listing
      preset={{ premium: true }}
      eyebrow="Genuine gemstones"
      title="The Premium Collection"
      description="Silver pieces set with genuine gemstones. Each listing states the stone and whether it is natural or laboratory-created. Optional gemstone testing is available on eligible pieces."
      tone="silver"
    />
  )
}
