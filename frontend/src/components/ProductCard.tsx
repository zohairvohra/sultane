import { Link } from 'react-router-dom'
import type { Product } from '../data/types'
import ProductImage from './ProductImage'
import { formatPKR } from '../lib/format'
import { assetUrl } from '../lib/api'

export default function ProductCard({ product, dark = false }: { product: Product; dark?: boolean }) {
  const [first, second] = product.images

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="relative">
        <ProductImage src={first?.url} alt={product.name} category={product.category} className="aspect-[4/5] w-full" dark={dark} />
        {second && (
          <img
            src={assetUrl(second.url)}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {product.isPremium && <span className="bg-rosegold text-noir text-[9px] uppercase tracking-[0.16em] px-2.5 py-1">Premium</span>}
          {product.status === 'paused' && <span className="bg-cream text-stone text-[9px] uppercase tracking-[0.16em] px-2.5 py-1">Temporarily unavailable</span>}
        </div>
      </div>
      <div className={`mt-4 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] ${dark ? 'text-silver' : 'text-stone'}`}>
        <span>{product.category}</span>
        {product.purity925 && <span className={dark ? 'text-rose-light' : 'text-rose-dark'}>925 Sterling Silver</span>}
      </div>
      <h3 className={`font-display text-xl mt-1 transition-colors ${dark ? 'text-cream group-hover:text-rose-light' : 'text-ink group-hover:text-rose-dark'}`}>
        {product.name}
      </h3>
      <div className={`text-sm mt-1 ${dark ? 'text-silver-light' : 'text-ink'}`}>{formatPKR(product.price)}</div>
    </Link>
  )
}
