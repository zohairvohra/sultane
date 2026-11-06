import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Package, MessageCircle, Heart } from 'lucide-react'
import ProductImage from '../components/ProductImage'
import ProductCard from '../components/ProductCard'
import { LinkButton } from '../components/Button'
import { getCollections, getProducts } from '../lib/api'
import type { Collection, Product } from '../data/types'

export default function Home() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [edit, setEdit] = useState<Product[]>([])

  useEffect(() => {
    getCollections().then(setCollections).catch(() => setCollections([]))
    getProducts()
      .then((products) => setEdit(products.filter((p) => p.isBestseller)))
      .catch(() => setEdit([]))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-maroon text-cream">
        <div className="mx-auto max-w-[1400px] grid md:grid-cols-2 gap-0">
          <div className="px-6 sm:px-10 py-16 sm:py-24 flex flex-col justify-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-cream/60 mb-6">
              The art of everyday adornment
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-6">
              Silver.
              <br />
              With a soul
              <br />
              of its own.
            </h1>
            <p className="text-cream/75 max-w-sm leading-relaxed mb-8">
              Expressive forms. Quiet details. Discover a considered world of silver jewellery,
              for your own kind of occasion.
            </p>
            <LinkButton to="/shop" variant="outline" className="!border-cream !text-cream hover:!bg-cream hover:!text-maroon w-fit">
              Explore the collections
            </LinkButton>
            <div className="flex justify-between mt-16 text-[11px] text-cream/40 uppercase tracking-wide">
              <span>The SULTANÉ edit · 2026</span>
              <span className="hidden sm:inline">Illustrative editorial imagery</span>
            </div>
          </div>
          <div className="relative min-h-[320px] md:min-h-0">
            <ProductImage
              category="Rings"
              collection="italia"
              className="absolute inset-0 w-full h-full !from-[#6b2638] !to-[#4a1725]"
              iconClassName="w-24 h-24 !text-cream/20"
            />
            <span className="absolute bottom-6 left-6 font-display italic text-cream/90 text-xl">
              A study in light &amp; form.
            </span>
          </div>
        </div>
      </section>

      {/* Five muses */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">A world of expression</div>
            <h2 className="font-display text-4xl sm:text-5xl text-maroon">Five muses. One SULTANÉ.</h2>
          </div>
          <p className="text-stone max-w-xs text-sm leading-relaxed">
            Our collections explore design inspiration, not manufacturing origin. Find the shapes that speak to you.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {collections.map((c) => (
            <Link key={c.slug} to={`/shop?collection=${c.slug}`} className="group">
              <ProductImage
                category="Rings"
                collection={c.slug}
                className="aspect-square w-full mb-4"
                iconClassName="w-12 h-12"
              />
              <div className="flex items-center justify-between text-ink group-hover:text-maroon transition-colors">
                <span className="font-display text-xl">{c.name}</span>
                <span className="text-sm">↗</span>
              </div>
              <p className="text-xs text-stone mt-1">{c.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="bg-blush-light">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-3">
                Pieces to make your own · Illustrative edit
              </div>
              <h2 className="font-display text-4xl sm:text-5xl text-maroon">A quiet kind of statement.</h2>
            </div>
            <LinkButton to="/shop" variant="outline" className="w-fit">
              View all jewellery
            </LinkButton>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {edit.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* The detail is the difference */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
        <ProductImage category="Pendants" collection="turkish" className="aspect-[4/3] w-full order-2 md:order-1" iconClassName="w-16 h-16" />
        <div className="order-1 md:order-2">
          <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">The SULTANÉ point of view</div>
          <h2 className="font-display text-4xl sm:text-5xl text-maroon mb-6 leading-tight">
            The detail is
            <br />
            the difference.
          </h2>
          <p className="text-stone leading-relaxed mb-4">
            A curve that catches the light. A pattern you notice twice. Our concept begins with jewellery as a
            personal language: expressive, thoughtful and never quite ordinary.
          </p>
          <p className="text-stone leading-relaxed mb-8">
            We look to fluid sculpture, ornament and geometry to shape a silver-led wardrobe. Material and finish
            details accompany each approved piece.
          </p>
          <LinkButton to="/about" variant="outline" className="w-fit">
            Explore our story
          </LinkButton>
        </div>
      </section>

      {/* Custom enquiry CTA */}
      <section className="bg-blush">
        <div className="mx-auto max-w-[1400px] grid md:grid-cols-2 gap-0 items-stretch">
          <div className="px-6 sm:px-10 py-16 sm:py-24 flex flex-col justify-center">
            <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-4">
              Personal, from the first sketch
            </div>
            <h2 className="font-display text-4xl sm:text-5xl text-maroon mb-5 leading-tight">
              An idea only
              <br />
              you could have.
            </h2>
            <p className="text-stone max-w-md leading-relaxed mb-8">
              A meaningful motif, a favourite silhouette, a piece imagined from scratch. Share your vision privately
              with our team.
            </p>
            <LinkButton to="/custom-jewellery" className="w-fit mb-4">
              Start a custom enquiry
            </LinkButton>
            <p className="text-xs text-stone">A saved request, not an order. Pricing follows a conversation.</p>
          </div>
          <ProductImage category="Rings" collection="bharat" className="min-h-[320px] md:min-h-0 w-full" iconClassName="w-16 h-16" />
        </div>
      </section>

      {/* Verify teaser */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24 grid md:grid-cols-2 gap-12">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-3">Know what a code can tell you</div>
          <h2 className="font-display text-4xl sm:text-5xl text-maroon mb-6 leading-tight">
            A record.
            <br />
            Not a promise of
            <br />
            authenticity.
          </h2>
          <LinkButton to="/verify" variant="outline" className="w-fit">
            Verify an article
          </LinkButton>
        </div>
        <div>
          <div className="font-display text-3xl text-maroon mb-4 tracking-wide">[ S / É ]</div>
          <p className="text-ink leading-relaxed mb-4">
            A lookup confirms that a code exists in SULTANÉ&rsquo;s registry. It does not independently prove an
            item is genuine.
          </p>
          <p className="text-sm text-stone leading-relaxed">
            The registry is intended for individual physical pieces. Copied codes are possible. Results display
            article information only, never buyer details.
          </p>
        </div>
      </section>

      {/* Care */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-4xl sm:text-5xl text-maroon">A little care goes a long way.</h2>
          <span className="hidden sm:block text-[11px] uppercase tracking-[0.12em] text-stone">
            Considered client care
          </span>
        </div>
        <div className="grid sm:grid-cols-3 gap-10">
          {[
            {
              icon: Sparkles,
              title: 'Keep the glow',
              body: 'Store separately, avoid perfumes and moisture, and wipe gently with a soft cloth. Ask us about piece-specific care.',
            },
            {
              icon: Package,
              title: 'Before it reaches you',
              body: 'Delivery charges, timelines and returns terms are shown clearly before you place an order.',
            },
            {
              icon: MessageCircle,
              title: 'A conversation, not a script',
              body: 'Need help with a size, a gift or a registry lookup? Contact our team with the details on WhatsApp.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon size={22} strokeWidth={1.5} className="text-maroon mb-4" />
              <h3 className="font-display text-xl text-ink mb-2">{title}</h3>
              <p className="text-sm text-stone leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Moodboard */}
      <section className="bg-blush-light">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-3">The SULTANÉ moodboard</div>
              <h2 className="font-display text-4xl sm:text-5xl text-maroon">Small moments. Lasting impressions.</h2>
            </div>
            <span className="text-[11px] uppercase tracking-[0.12em] text-maroon/70">A curated visual journal ↗</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['italia', 'bharat', 'turkish', 'moroccan'] as const).map((slug, i) => (
              <ProductImage
                key={slug}
                category={(['Rings', 'Earrings', 'Pendants', 'Bracelets'] as const)[i]}
                collection={slug}
                className="aspect-square w-full"
                iconClassName="w-10 h-10"
              />
            ))}
          </div>
          <p className="text-xs text-stone mt-6 max-w-xl">
            Illustrative editorial imagery, not customer photographs or social proof. Product styling is concept
            content.
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-blush">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-3">Letters from SULTANÉ</div>
            <h2 className="font-display text-4xl sm:text-5xl text-maroon mb-3">A little beauty, occasionally.</h2>
            <p className="text-stone">Collection stories, thoughtful edits and news from our world.</p>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col gap-3 bg-cream p-6 sm:p-8"
          >
            <label className="text-xs text-stone" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="Your email address"
              className="border border-line bg-cream px-4 py-3 text-sm focus:outline-none focus:border-maroon"
            />
            <label className="flex items-start gap-2 text-xs text-stone mt-1">
              <input type="checkbox" className="mt-0.5" />
              I agree to receive SULTANÉ emails. I can unsubscribe at any time.
            </label>
            <button
              type="submit"
              className="mt-3 bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-3.5 hover:bg-maroon-dark transition-colors flex items-center justify-center gap-2 w-fit"
            >
              Subscribe
              <Heart size={13} />
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
