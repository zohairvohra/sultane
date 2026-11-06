import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gem, Hammer, ShieldCheck, Truck, Upload, PenLine } from 'lucide-react'
import HeroVideo from '../components/HeroVideo'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'
import { LinkButton } from '../components/Button'
import { getProducts, assetUrl } from '../lib/api'
import { useSettings } from '../context/SettingsContext'
import { useCollections } from '../lib/useCollections'
import type { Product } from '../data/types'

function SectionHead({ eyebrow, title, link, dark = false }: { eyebrow: string; title: string; link?: { to: string; label: string }; dark?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
      <div>
        <div className={`eyebrow mb-3 ${dark ? 'text-rose-light' : 'text-rose-dark'}`}>{eyebrow}</div>
        <h2 className={`font-display text-4xl sm:text-5xl ${dark ? 'text-cream' : 'text-noir'}`}>{title}</h2>
      </div>
      {link && (
        <LinkButton to={link.to} variant={dark ? 'light' : 'outline'} className="w-fit">
          {link.label}
        </LinkButton>
      )}
    </div>
  )
}

export default function Home() {
  const { settings } = useSettings()
  const collections = useCollections()
  const [products, setProducts] = useState<Product[] | null>(null)

  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  const bestsellers = (products ?? []).filter((p) => p.isBestseller).slice(0, 8)
  const premium = (products ?? []).filter((p) => p.isPremium).slice(0, 4)
  const mens = (products ?? []).filter((p) => p.isMens).slice(0, 4)
  const storyIntro = settings.about_story.split(/\n{2,}/)[0]

  return (
    <div>
      {/* 1 — Hero video */}
      <HeroVideo videoUrl={settings.hero_video_url} posterUrl={settings.hero_poster_url} />

      {/* Trust strip — only claims the business actually makes */}
      <section className="border-b border-line bg-cream">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-6 grid grid-cols-2 lg:grid-cols-4 gap-5 text-xs text-stone">
          {[
            { icon: Hammer, text: 'Made to order for you' },
            { icon: ShieldCheck, text: 'Unique article number per piece' },
            { icon: Gem, text: 'Optional gemstone testing on Premium' },
            { icon: Truck, text: 'Free delivery within Karachi' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <Icon size={18} strokeWidth={1.2} className="text-rose shrink-0" />
              <span className="tracking-wide">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2 — Bestsellers */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
        <SectionHead eyebrow="Most loved" title="Bestsellers" link={{ to: '/shop', label: 'Shop all jewellery' }} />
        {products === null ? (
          <div className="py-16 text-center text-stone">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
            {bestsellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* 3 — Premium Collection */}
      {premium.length > 0 && (
        <section className="bg-blush-light">
          <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24 grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
            <div className="lg:sticky lg:top-40 h-fit">
              <div className="eyebrow text-rose-dark mb-3">Genuine gemstones</div>
              <h2 className="font-display text-4xl sm:text-5xl text-noir mb-5">The Premium Collection</h2>
              <p className="text-stone leading-relaxed mb-6">
                Reserved for pieces set with genuine gemstones — each listing states the stone, whether it is natural or
                laboratory-created, and offers optional independent gemstone testing.
              </p>
              <LinkButton to="/premium" variant="primary" className="w-fit">Explore Premium</LinkButton>
            </div>
            <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-10">
              {premium.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* 4 — Men's Collection (darker, stronger styling) */}
      {mens.length > 0 && (
        <section className="bg-noir">
          <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
            <SectionHead eyebrow="For him" title="The Men's Collection" link={{ to: '/mens', label: "Shop men's" }} dark />
            <div className="flex flex-wrap gap-3 mb-10">
              {[['Chains', '/mens/chains'], ['Rings', '/mens/rings'], ['Bracelets', '/mens/bracelets']].map(([label, to]) => (
                <Link key={to} to={to} className="border border-silver/30 text-silver-light text-[11px] uppercase tracking-[0.16em] px-5 py-2.5 hover:border-rose-light hover:text-rose-light transition-colors">
                  {label}
                </Link>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
              {mens.map((p) => <ProductCard key={p.id} product={p} dark />)}
            </div>
          </div>
        </section>
      )}

      {/* 5 — Customise Your Jewellery */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="eyebrow text-rose-dark mb-3">Made around you</div>
          <h2 className="font-display text-4xl sm:text-5xl text-noir mb-4">Customise Your Jewellery</h2>
          <p className="text-stone leading-relaxed">
            Change a chain, adjust a size or bring us a completely new idea. Our jewellery maker reviews every request
            and we confirm feasibility and price with you on WhatsApp — nothing is charged until you approve.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-line p-8 sm:p-10 flex flex-col">
            <PenLine size={26} strokeWidth={1.1} className="text-rose mb-5" />
            <h3 className="font-display text-3xl text-noir mb-3">Modify an existing design</h3>
            <p className="text-stone text-sm leading-relaxed mb-8">
              Open any piece and choose <em>Customise This Design — Request Price</em>. Keep the pendant, change the chain,
              resize a ring, or swap a finish.
            </p>
            <LinkButton to="/shop" variant="outline" className="w-fit mt-auto">Browse designs</LinkButton>
          </div>
          <div className="bg-noir text-cream p-8 sm:p-10 flex flex-col">
            <Upload size={26} strokeWidth={1.1} className="text-rose-light mb-5" />
            <h3 className="font-display text-3xl mb-3">Create something new</h3>
            <p className="text-silver-light text-sm leading-relaxed mb-8">
              Upload an inspiration image, describe the piece you imagine, and continue the conversation with us on
              WhatsApp.
            </p>
            <LinkButton to="/custom-jewellery" variant="rose" className="w-fit mt-auto">Start a custom design</LinkButton>
          </div>
        </div>
      </section>

      {/* 6 — The SULTANÉ Story */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          <ProductImage
            src={settings.hero_poster_url || bestsellers[0]?.images[0]?.url}
            alt="SULTANÉ jewellery"
            category="Necklaces"
            className="aspect-[4/3] w-full"
          />
          <div>
            <div className="eyebrow text-rose-dark mb-3">Our story</div>
            <h2 className="font-display text-4xl sm:text-5xl text-noir mb-6 leading-tight">The SULTANÉ Story</h2>
            <p className="text-stone leading-relaxed mb-8 whitespace-pre-line">{storyIntro}</p>
            <div className="flex flex-wrap gap-4">
              <LinkButton to="/about" variant="outline" className="w-fit">Read our story</LinkButton>
              <LinkButton to="/verify" variant="ghost" className="w-fit">Verify your piece</LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* 7 — Collection discovery tiles */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
        <SectionHead eyebrow="Three traditions" title="Discover the Collections" link={{ to: '/collections', label: 'All collections' }} />
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {collections.map((c) => {
            const cover = c.imageUrl ?? (products ?? []).find((p) => p.collections.includes(c.slug) && p.images[0])?.images[0]?.url
            return (
              <Link key={c.slug} to={`/collections/${c.slug}`} className="group relative block aspect-[3/4] overflow-hidden bg-noir">
                {cover ? (
                  <img src={assetUrl(cover)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#3d2c30,#141213)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-noir/80 via-noir/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="eyebrow text-rose-light mb-2">{c.tagline}</div>
                  <div className="font-display text-4xl text-cream flex items-center justify-between">
                    {c.name}
                    <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
