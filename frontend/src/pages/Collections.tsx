import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageBanner from '../components/PageBanner'
import ProductImage from '../components/ProductImage'
import { getCollections } from '../lib/api'
import type { Collection } from '../data/types'

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([])

  useEffect(() => {
    getCollections().then(setCollections).catch(() => setCollections([]))
  }, [])

  return (
    <div>
      <PageBanner
        eyebrow="The five muses"
        title="Design worlds, not origins."
        description="Each SULTANÉ collection explores a different aesthetic inspiration. Names describe a design language, not where a piece is manufactured."
        image={<ProductImage category="Necklaces" collection="italia" className="w-full h-full" iconClassName="w-16 h-16" />}
      />
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 grid sm:grid-cols-2 gap-8">
        {collections.map((c) => (
          <Link key={c.slug} to={`/shop?collection=${c.slug}`} className="group">
            <ProductImage category="Rings" collection={c.slug} className="aspect-[16/10] w-full mb-5" iconClassName="w-14 h-14" />
            <div className="flex items-center justify-between text-ink group-hover:text-maroon transition-colors">
              <h2 className="font-display text-3xl">{c.name}</h2>
              <span>↗</span>
            </div>
            <p className="text-stone text-sm mt-2 max-w-md">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
