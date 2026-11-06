import PageBanner from '../components/PageBanner'
import ProductImage from '../components/ProductImage'

export default function About() {
  return (
    <div>
      <PageBanner
        eyebrow="The SULTANÉ point of view"
        title="A considered expression."
        description="SULTANÉ is a silver jewellery concept built around craftsmanship, quiet detail and made-to-order production — for the everyday, and the days you remember."
        image={<ProductImage category="Necklaces" collection="moroccan" className="w-full h-full" iconClassName="w-16 h-16" />}
      />
      <div className="mx-auto max-w-[800px] px-6 sm:px-10 py-16 space-y-6 text-stone leading-relaxed">
        <p>
          We look to fluid sculpture, ornament and geometry to shape a silver-led wardrobe — five muses, one point of
          view. Every design begins as a sketch before it becomes a piece, and every piece is made to order once a
          request is confirmed.
        </p>
        <p>
          Because we manufacture after an order is placed rather than from held stock, production takes time. We
          would rather be honest about that timeline than promise a piece we cannot deliver.
        </p>
        <p>
          Material, fineness and weight details accompany each approved piece. Where a product is genuine 925
          sterling silver, it is labelled accordingly — we do not apply that claim without confirmation.
        </p>
      </div>
    </div>
  )
}
