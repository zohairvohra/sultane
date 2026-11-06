import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageBanner from '../components/PageBanner'
import ProductImage from '../components/ProductImage'
import ProductCard from '../components/ProductCard'
import { getCollections, getProducts } from '../lib/api'
import type { Category, Collection, CollectionSlug, Product } from '../data/types'

const CATEGORIES: Category[] = ['Rings', 'Earrings', 'Pendants', 'Bracelets', 'Chains', 'Necklaces']
const PAGE_SIZE = 9
const MAX_PRICE = 45000

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export default function Shop() {
  const [searchParams] = useSearchParams()
  const initialCollection = searchParams.get('collection') as CollectionSlug | null

  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(new Set())
  const [collectionFilter, setCollectionFilter] = useState<Set<CollectionSlug>>(
    new Set(initialCollection ? [initialCollection] : []),
  )
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE)
  const [availability, setAvailability] = useState<Set<'available' | 'enquire'>>(new Set())
  const [sort, setSort] = useState<Sort>('featured')
  const [page, setPage] = useState(1)

  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProducts(), getCollections()])
      .then(([p, c]) => {
        setProducts(p)
        setCollections(c)
      })
      .catch(() => {
        setProducts([])
        setCollections([])
      })
      .finally(() => setLoading(false))
  }, [])

  const toggle = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    setter(next)
    setPage(1)
  }

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (categoryFilter.size && !categoryFilter.has(p.category)) return false
      if (collectionFilter.size && !collectionFilter.has(p.collection)) return false
      if (p.price < minPrice || p.price > maxPrice) return false
      if (availability.size && !availability.has(p.availability)) return false
      return true
    })

    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))

    return list
  }, [products, categoryFilter, collectionFilter, minPrice, maxPrice, availability, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearAll = () => {
    setCategoryFilter(new Set())
    setCollectionFilter(new Set())
    setMinPrice(0)
    setMaxPrice(MAX_PRICE)
    setAvailability(new Set())
    setPage(1)
  }

  return (
    <div>
      <PageBanner
        eyebrow="The collections / All jewellery"
        title="Objects of expression."
        description={
          <>
            <p className="mb-3">
              Explore five design worlds through rings, earrings, pendants and more. Collection names describe
              aesthetic inspiration, not where a piece is manufactured.
            </p>
            <p className="text-xs">All products and prices below are illustrative concept content.</p>
          </>
        }
        image={<ProductImage category="Pendants" collection="middle-eastern" className="w-full h-full" iconClassName="w-16 h-16" />}
      />

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-10">
        <div className="flex items-center justify-between mb-8 text-sm">
          <span className="text-stone">The complete edit · {products.length} sample pieces</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="border border-line bg-cream px-3 py-2 text-sm focus:outline-none focus:border-maroon"
          >
            <option value="featured">Sort by: Featured</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-10">
          <aside className="space-y-8">
            <h2 className="font-display text-2xl text-maroon">Refine the edit</h2>

            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-3">Category</div>
              <div className="space-y-2.5">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryFilter.has(c)}
                      onChange={() => toggle(categoryFilter, c, setCategoryFilter)}
                      className="accent-maroon"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-3">Inspiration collection</div>
              <div className="space-y-2.5">
                {collections.map((c) => (
                  <label key={c.slug} className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={collectionFilter.has(c.slug)}
                      onChange={() => toggle(collectionFilter, c.slug, setCollectionFilter)}
                      className="accent-maroon"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-3">Price · PKR</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minPrice}
                  min={0}
                  onChange={(e) => { setMinPrice(Number(e.target.value)); setPage(1) }}
                  className="w-full border border-line bg-cream px-2 py-1.5 text-sm focus:outline-none focus:border-maroon"
                />
                <span className="text-stone">—</span>
                <input
                  type="number"
                  value={maxPrice}
                  min={0}
                  onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1) }}
                  className="w-full border border-line bg-cream px-2 py-1.5 text-sm focus:outline-none focus:border-maroon"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-3">Availability</div>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availability.has('available')}
                    onChange={() => toggle(availability, 'available', setAvailability)}
                    className="accent-maroon"
                  />
                  Available to order
                </label>
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availability.has('enquire')}
                    onChange={() => toggle(availability, 'enquire', setAvailability)}
                    className="accent-maroon"
                  />
                  Made to enquire
                </label>
              </div>
            </div>

            <button onClick={clearAll} className="text-xs text-maroon underline underline-offset-2">
              Clear all filters
            </button>
          </aside>

          <div>
            {loading ? (
              <div className="py-24 text-center text-stone">Loading the collection…</div>
            ) : pageItems.length === 0 ? (
              <div className="py-24 text-center text-stone">
                No pieces match these filters yet.{' '}
                <button onClick={clearAll} className="text-maroon underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
                {pageItems.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-6 border-t border-line">
              <span className="text-sm text-stone">
                Showing {pageItems.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + pageItems.length} of{' '}
                {filtered.length} illustrative pieces
              </span>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-9 h-9 text-sm flex items-center justify-center ${
                      n === page ? 'bg-maroon text-cream' : 'bg-cream-dark text-ink hover:bg-sand/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 h-9 text-sm bg-cream-dark text-ink hover:bg-sand/40 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
