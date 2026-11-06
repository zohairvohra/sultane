import type { ReactNode } from 'react'

interface PageBannerProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  tone?: 'blush' | 'noir' | 'silver'
  image?: string | null
}

export default function PageBanner({ eyebrow, title, description, tone = 'blush', image }: PageBannerProps) {
  const bg = tone === 'noir' ? 'bg-noir text-cream' : tone === 'silver' ? 'bg-cream-dark' : 'bg-blush-light'
  return (
    <div className={`relative overflow-hidden ${bg}`}>
      {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
      <div className="relative mx-auto max-w-[1400px] px-6 sm:px-10 py-14 sm:py-20 text-center">
        {eyebrow && <div className={`eyebrow mb-4 ${tone === 'noir' ? 'text-rose-light' : 'text-rose-dark'}`}>{eyebrow}</div>}
        <h1 className={`font-display text-4xl sm:text-6xl leading-[1.05] ${tone === 'noir' ? 'text-cream' : 'text-noir'}`}>{title}</h1>
        {description && (
          <div className={`mt-5 max-w-2xl mx-auto leading-relaxed ${tone === 'noir' ? 'text-silver-light' : 'text-stone'}`}>{description}</div>
        )}
      </div>
    </div>
  )
}
