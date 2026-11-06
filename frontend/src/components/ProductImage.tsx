import { useState } from 'react'
import { Circle, Droplet, Gem, Link2, CircleDashed, Sparkle } from 'lucide-react'
import type { Category } from '../data/types'
import { assetUrl } from '../lib/api'

const ICONS: Record<Category, typeof Circle> = {
  Rings: Circle,
  Earrings: Droplet,
  Pendants: Gem,
  Bracelets: CircleDashed,
  Chains: Link2,
  Necklaces: Sparkle,
}

interface Props {
  src?: string | null
  alt: string
  category?: Category
  className?: string
  dark?: boolean
  loading?: 'lazy' | 'eager'
}

// Shows the owner's product photograph; until one is uploaded, an
// on-brand silver placeholder (never stock imagery) is shown instead.
export default function ProductImage({ src, alt, category = 'Rings', className = '', dark = false, loading = 'lazy' }: Props) {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(src)
  const Icon = ICONS[category] ?? Gem

  return (
    <div className={`product-media relative overflow-hidden ${dark ? 'bg-noir-light' : 'bg-gradient-to-br from-silver-light via-cream-dark to-blush-light'} ${className}`}>
      {url && !failed ? (
        <img src={url} alt={alt} loading={loading} decoding="async" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" role="img" aria-label={`${alt} — photograph coming soon`}>
          <Icon className={`w-1/5 h-1/5 max-w-16 max-h-16 ${dark ? 'text-silver/40' : 'text-rose/40'}`} strokeWidth={0.8} />
          <span className={`font-display tracking-[0.3em] text-[10px] ${dark ? 'text-silver/40' : 'text-rose/50'}`}>SULTANÉ</span>
        </div>
      )}
    </div>
  )
}
