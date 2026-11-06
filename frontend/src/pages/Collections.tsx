import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import PageBanner from '../components/PageBanner'
import { Listing } from './Shop'
import { useCollections } from '../lib/useCollections'
import { assetUrl, getProducts } from '../lib/api'
import type { Product } from '../data/types'

export default function Collections() {
  const collections = useCollections()
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  return (
    <div>
      <PageBanner
        eyebrow="Collections"
        title="Three traditions, one SULTANÉ."
        description="Our cultural collections describe design inspiration — not where a piece is made. Every SULTANÉ piece is made to order in Pakistan."
      />
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 space-y-6">
        {collections.map((c, i) => {
          const cover = c.imageUrl ?? products.find((p) => p.collections.includes(c.slug) && p.images[0])?.images[0]?.url
          return (
            <Link key={c.slug} to={`/collections/${c.slug}`} className={`group grid md:grid-cols-2 bg-cream-dark overflow-hidden ${i % 2 ? 'md:[direction:rtl]' : ''}`}>
              <div className="relative aspect-[4/3] bg-noir overflow-hidden">
                {cover ? (
                  <img src={assetUrl(cover)} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#3d2c30,#141213)] flex items-center justify-center">
                    <span className="font-display text-5xl text-rosegold">{c.name}</span>
                  </div>
                )}
              </div>
              <div className="p-8 sm:p-14 flex flex-col justify-center [direction:ltr]">
                <div className="eyebrow text-rose-dark mb-3">{c.tagline}</div>
                <h2 className="font-display text-5xl text-noir mb-4">{c.name}</h2>
                <p className="text-stone leading-relaxed mb-6">{c.description}</p>
                <span className="text-[11px] uppercase tracking-[0.18em] text-noir group-hover:text-rose-dark">
                  Explore {c.productCount} {c.productCount === 1 ? 'piece' : 'pieces'} →
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function CollectionLanding() {
  const { slug } = useParams()
  const collections = useCollections()
  const collection = collections.find((c) => c.slug === slug)
  if (collections.length && !collection) return <Navigate to="/collections" replace />
  if (!collection) return <div className="py-24 text-center text-stone">Loading…</div>
  return (
    <Listing
      key={collection.slug}
      preset={{ collection: collection.slug }}
      eyebrow={`${collection.tagline}`}
      title={collection.name}
      description={collection.description}
      tone={collection.imageUrl ? 'noir' : 'blush'}
      image={collection.imageUrl}
    />
  )
}
