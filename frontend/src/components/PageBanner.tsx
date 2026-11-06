import type { ReactNode } from 'react'

interface PageBannerProps {
  eyebrow: string
  title: string
  description?: ReactNode
  image?: ReactNode
}

export default function PageBanner({ eyebrow, title, description, image }: PageBannerProps) {
  return (
    <div className="bg-blush">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-4">{eyebrow}</div>
          <h1 className="font-display text-5xl sm:text-6xl text-maroon leading-[1.05]">{title}</h1>
          {description && <div className="mt-5 text-stone max-w-lg leading-relaxed">{description}</div>}
        </div>
        {image && <div className="aspect-[4/3] w-full">{image}</div>}
      </div>
    </div>
  )
}
