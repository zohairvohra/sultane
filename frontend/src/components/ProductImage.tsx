import { Circle, Droplet, Gem, Link2, CircleDashed, Sparkle } from 'lucide-react'
import type { Category, CollectionSlug } from '../data/types'

const ICONS: Record<Category, typeof Circle> = {
  Rings: Circle,
  Earrings: Droplet,
  Pendants: Gem,
  Bracelets: CircleDashed,
  Chains: Link2,
  Necklaces: Sparkle,
}

const TINTS: Record<CollectionSlug, string> = {
  italia: 'from-[#efe6d8] to-[#e2d3c0]',
  bharat: 'from-[#f3dfdd] to-[#e6c6c6]',
  turkish: 'from-[#ece0da] to-[#ddc6ba]',
  'middle-eastern': 'from-[#e7ddcf] to-[#d4c2a8]',
  moroccan: 'from-[#eee2d9] to-[#ddc9b4]',
}

interface ProductImageProps {
  category: Category
  collection: CollectionSlug
  className?: string
  iconClassName?: string
}

export default function ProductImage({
  category,
  collection,
  className = '',
  iconClassName = '',
}: ProductImageProps) {
  const Icon = ICONS[category]
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${TINTS[collection]} ${className}`}
    >
      <Icon className={`text-maroon/25 ${iconClassName}`} strokeWidth={1} />
      <span className="absolute bottom-2 right-2 text-[9px] uppercase tracking-wider text-maroon/40 font-medium">
        Illustrative
      </span>
    </div>
  )
}
