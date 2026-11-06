import PageBanner from '../components/PageBanner'
import ProductImage from '../components/ProductImage'

const FAQS = [
  {
    q: 'How long does an order take to produce?',
    a: 'Each product page lists an estimated production window, separate from courier transit time. Most standard pieces take 5–14 working days to make.',
  },
  {
    q: 'How do I pay?',
    a: 'At launch we support cash on delivery and bank transfer. Bank transfer orders begin production only after the team manually verifies your payment.',
  },
  {
    q: 'What is your delivery policy?',
    a: 'Delivery within Karachi is free. Delivery elsewhere in Pakistan carries a charge shown at checkout before you place your order.',
  },
  {
    q: 'Can I return a piece?',
    a: 'We do not accept change-of-mind returns. If a piece arrives defective or incorrect, report it on WhatsApp within 24 hours with your order number and photos or video — this is handled separately from standard returns.',
  },
  {
    q: 'How do I care for my jewellery?',
    a: 'Store pieces separately, avoid perfume and moisture, and wipe gently with a soft cloth. Contact us on WhatsApp for piece-specific guidance.',
  },
  {
    q: 'What does gemstone testing include?',
    a: 'Eligible Premium Collection pieces offer optional testing and certification for Rs. 799, selected by default at checkout. You can untick it if you do not want the add-on.',
  },
  {
    q: 'How does article verification work?',
    a: 'Every purchased piece receives a unique article code after payment is verified. Looking it up on our Verify page confirms the code exists in our registry — it does not independently prove authenticity.',
  },
]

export default function Care() {
  return (
    <div>
      <PageBanner
        eyebrow="Client care"
        title="Delivery, returns & care."
        description="Clear policies, shown before you order — not buried after."
        image={<ProductImage category="Bracelets" collection="turkish" className="w-full h-full" iconClassName="w-16 h-16" />}
      />
      <div className="mx-auto max-w-[800px] px-6 sm:px-10 py-16">
        <div className="space-y-10">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-line pb-8">
              <h2 className="font-display text-2xl text-ink mb-2">{f.q}</h2>
              <p className="text-stone leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="bg-cream-dark p-6 mt-10">
          <div className="text-sm font-medium text-ink mb-1">Still need help?</div>
          <p className="text-sm text-stone">
            Message our team directly on WhatsApp using the button in the corner of your screen — that is our
            primary support channel.
          </p>
        </div>
      </div>
    </div>
  )
}
