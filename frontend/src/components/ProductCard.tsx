import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Product } from '../data/types'
import ProductImage from './ProductImage'
import { formatPKR } from '../lib/format'
import { collectionBySlug } from '../data/collections'

export default function ProductCard({ product }: { product: Product }) {
  const collection = collectionBySlug(product.collection)

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="relative">
        <ProductImage
          category={product.category}
          collection={product.collection}
          className="aspect-square w-full"
          iconClassName="w-14 h-14"
        />
        <button
          onClick={(e) => e.preventDefault()}
          aria-label="Save to wishlist"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cream/80 flex items-center justify-center text-maroon hover:bg-cream transition-colors"
        >
          <Heart size={15} strokeWidth={1.75} />
        </button>
        {product.availability === 'enquire' && (
          <span className="absolute bottom-3 left-3 bg-cream text-[10px] uppercase tracking-wide px-2.5 py-1 text-stone">
            Made to enquire
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-stone">
        <span>{collection?.name}</span>
        <span>Illustrative</span>
      </div>
      <h3 className="font-display text-xl text-ink mt-1 group-hover:text-maroon transition-colors">
        {product.name}
      </h3>
      <div className="text-sm text-stone mt-1">{formatPKR(product.price)}</div>
    </Link>
  )
}
