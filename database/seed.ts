import bcrypt from 'bcryptjs'
import { pool } from './pool'

// Sample catalogue content for development. Every value here can be edited
// (or deleted) by the owner through the admin dashboard — nothing below is
// hard-coded into the storefront.

const collections = [
  {
    slug: 'italia',
    name: 'Italia',
    tagline: 'Fluid lines, sculptural ease.',
    description:
      'Soft, poured silhouettes and polished links inspired by Italian jewellery traditions. A design language — not a claim of manufacturing origin.',
    position: 1,
  },
  {
    slug: 'turkish',
    name: 'Turkish',
    tagline: 'Intricate motifs, reimagined.',
    description:
      'Medallions, filigree and motif work inspired by Turkish decorative arts, rendered in silver for the modern wardrobe.',
    position: 2,
  },
  {
    slug: 'middle-eastern',
    name: 'Middle Eastern',
    tagline: 'Bold forms, luminous presence.',
    description:
      'Confident, sculptural silhouettes with hammered and brushed finishes, drawing on the regal jewellery traditions of the Middle East.',
    position: 3,
  },
]

type SeedProduct = {
  sku: string
  slug: string
  name: string
  category: 'Necklaces' | 'Earrings' | 'Bracelets' | 'Rings' | 'Chains' | 'Pendants'
  price: number
  description: string
  collections: string[]
  sizes?: string[]
  production?: string
  bestseller?: boolean
  premium?: boolean
  mens?: boolean
  status?: 'active' | 'paused' | 'draft'
  gemstone?: { type: string; origin: 'natural' | 'lab-created'; details: string }
}

const products: SeedProduct[] = [
  // ── Women's / core ──────────────────────────────────────────
  { sku: 'SLT-NK-001', slug: 'corso-bar-necklace', name: 'Corso Bar Necklace', category: 'Necklaces', price: 23500, collections: ['italia'], bestseller: true, description: 'A minimal sculptural bar pendant on a fine curb chain.' },
  { sku: 'SLT-NK-002', slug: 'onda-wave-necklace', name: 'Onda Wave Necklace', category: 'Necklaces', price: 25500, collections: ['italia'], description: 'A wave-link chain necklace with soft, sculptural movement.' },
  { sku: 'SLT-NK-003', slug: 'sahar-collar-necklace', name: 'Sahar Collar Necklace', category: 'Necklaces', price: 38000, collections: ['middle-eastern'], bestseller: true, description: 'A bold collar silhouette with a brushed, luminous finish.', production: '10–14 working days' },
  { sku: 'SLT-PD-001', slug: 'ayla-medallion-pendant', name: 'Ayla Medallion Pendant', category: 'Pendants', price: 16800, collections: ['turkish'], bestseller: true, description: 'An intricate medallion motif suspended on a fine chain.' },
  { sku: 'SLT-ER-001', slug: 'lale-drop-earrings', name: 'Lale Drop Earrings', category: 'Earrings', price: 18900, collections: ['turkish'], description: 'Tulip-inspired drops with fine filigree detail.' },
  { sku: 'SLT-ER-002', slug: 'noor-hoop-earrings', name: 'Noor Hoop Earrings', category: 'Earrings', price: 14500, collections: ['middle-eastern'], bestseller: true, description: 'Hammered silver hoops with a soft, luminous texture.' },
  { sku: 'SLT-ER-003', slug: 'vela-sculpted-studs', name: 'Vela Sculpted Studs', category: 'Earrings', price: 11800, collections: ['italia'], description: 'Small, mirror-polished sculpted studs for everyday wear.' },
  { sku: 'SLT-BR-001', slug: 'elif-link-bracelet', name: 'Elif Link Bracelet', category: 'Bracelets', price: 20500, collections: ['turkish'], description: 'A refined link bracelet with a motif clasp.', sizes: ['16 cm', '17 cm', '18 cm', '19 cm'] },
  { sku: 'SLT-BR-002', slug: 'safiya-open-cuff', name: 'Safiya Open Cuff', category: 'Bracelets', price: 24800, collections: ['middle-eastern'], description: 'A brushed, bold cuff with an adjustable open back.' },
  { sku: 'SLT-BR-003', slug: 'sera-paperclip-bracelet', name: 'Sera Paperclip Bracelet', category: 'Bracelets', price: 15900, collections: ['italia'], status: 'paused', description: 'A fluid paperclip-link bracelet designed to layer or wear alone.', sizes: ['16 cm', '17 cm', '18 cm'] },
  { sku: 'SLT-RG-001', slug: 'luna-sculpted-ring', name: 'Luna Sculpted Ring', category: 'Rings', price: 18500, collections: ['italia'], bestseller: true, description: 'A fluid crescent with a luminous surface.', sizes: ['6', '7', '8', '9'] },
  { sku: 'SLT-RG-002', slug: 'esma-medallion-ring', name: 'Esma Medallion Ring', category: 'Rings', price: 19200, collections: ['turkish'], description: 'A miniature medallion motif set into a comfortable band.', sizes: ['6', '7', '8', '9'] },

  // ── Premium (genuine gemstones) ────────────────────────────
  { sku: 'SLT-PR-001', slug: 'layla-emerald-necklace', name: 'Layla Emerald Necklace', category: 'Necklaces', price: 42000, collections: ['middle-eastern'], premium: true, bestseller: true, production: '14–18 working days', description: 'A statement necklace centred on a single emerald, framed in brushed silver.', gemstone: { type: 'Emerald', origin: 'natural', details: 'Single oval-cut emerald, approx. 7 × 5 mm.' } },
  { sku: 'SLT-PR-002', slug: 'firuze-turquoise-pendant', name: 'Firuze Turquoise Pendant', category: 'Pendants', price: 27500, collections: ['turkish'], premium: true, production: '10–14 working days', description: 'A medallion pendant set with turquoise, inspired by Ottoman motif work.', gemstone: { type: 'Turquoise', origin: 'natural', details: 'Cabochon turquoise, approx. 10 mm.' } },
  { sku: 'SLT-PR-003', slug: 'amara-ruby-ring', name: 'Amara Ruby Ring', category: 'Rings', price: 31500, collections: ['italia'], premium: true, production: '10–14 working days', sizes: ['6', '7', '8', '9'], description: 'A sculpted band holding a ruby in a low, modern bezel.', gemstone: { type: 'Ruby', origin: 'lab-created', details: 'Round-cut laboratory-created ruby, approx. 5 mm.' } },
  { sku: 'SLT-PR-004', slug: 'zafira-sapphire-earrings', name: 'Zafira Sapphire Earrings', category: 'Earrings', price: 34000, collections: ['middle-eastern', 'turkish'], premium: true, production: '14–18 working days', description: 'Drop earrings set with blue sapphires and fine granulation.', gemstone: { type: 'Sapphire', origin: 'natural', details: 'Pair of pear-cut sapphires, approx. 6 × 4 mm each.' } },

  // ── Men's ───────────────────────────────────────────────────
  { sku: 'SLT-MC-001', slug: 'sultan-cuban-chain', name: 'Sultan Cuban Chain', category: 'Chains', price: 32000, collections: ['middle-eastern'], mens: true, bestseller: true, sizes: ['20 in', '22 in', '24 in'], description: 'A heavy Cuban-link chain with a polished box clasp.' },
  { sku: 'SLT-MC-002', slug: 'roma-figaro-chain', name: 'Roma Figaro Chain', category: 'Chains', price: 26000, collections: ['italia'], mens: true, sizes: ['20 in', '22 in', '24 in'], description: 'A classic Figaro-link chain with a confident weight.' },
  { sku: 'SLT-MR-001', slug: 'osman-signet-ring', name: 'Osman Signet Ring', category: 'Rings', price: 22500, collections: ['turkish'], mens: true, sizes: ['9', '10', '11', '12'], description: 'A substantial signet ring with an engraved motif border.' },
  { sku: 'SLT-MR-002', slug: 'atlas-band-ring', name: 'Atlas Band Ring', category: 'Rings', price: 17500, collections: ['middle-eastern'], mens: true, sizes: ['9', '10', '11', '12'], description: 'A hammered, matte band with a bold profile.' },
  { sku: 'SLT-MB-001', slug: 'malik-curb-bracelet', name: 'Malik Curb Bracelet', category: 'Bracelets', price: 24000, collections: ['middle-eastern'], mens: true, sizes: ['19 cm', '20 cm', '21 cm'], description: 'A wide curb-link bracelet with a secure lobster clasp.' },
  { sku: 'SLT-MB-002', slug: 'venezia-box-bracelet', name: 'Venezia Box Bracelet', category: 'Bracelets', price: 19800, collections: ['italia'], mens: true, sizes: ['19 cm', '20 cm', '21 cm'], description: 'A sleek box-link bracelet with a mirror finish.' },
]

const FAQS = [
  { q: 'How do I place an order?', a: 'Add standard designs to your bag and check out as a guest or with an account. You will receive an order number and bank-transfer instructions straight away.' },
  { q: 'How do I pay?', a: 'At launch we accept bank transfer only. After placing your order, transfer the total shown and upload your receipt on the order page, or send it to us on WhatsApp. Production begins only after our team manually verifies the payment.' },
  { q: 'How long does production take?', a: 'Every SULTANÉ piece is made to order. Each product page shows its estimated production time. Courier transit time is separate and follows dispatch.' },
  { q: 'What does delivery cost?', a: 'Delivery within Karachi is free. A delivery charge applies elsewhere in Pakistan and is shown at checkout before you submit your order.' },
  { q: 'Can I customise a design?', a: 'Yes. Use "Customise This Design — Request Price" on any product page, or submit an inspiration image through Customised Jewellery. We will confirm feasibility and price on WhatsApp — nothing is charged until you approve a quotation.' },
  { q: 'What is gemstone testing?', a: 'Eligible Premium Collection pieces offer optional gemstone testing for Rs. 799 per piece. It is selected by default and you can untick it. Documentation depends on the testing service used and is confirmed before dispatch.' },
  { q: 'What is my article number?', a: 'Once your payment is verified, every piece you purchased receives its own unique article number. It appears on your order page, is shared on WhatsApp and is printed on your SULTANÉ authenticity card with a QR code.' },
  { q: 'How do I verify my piece?', a: 'Visit Verify Your Piece and enter the article number, or scan the QR code on your authenticity card. A registered number shows the owner’s name, the piece name and the purchase date — never contact or address details.' },
  { q: 'How should I care for silver jewellery?', a: 'Store each piece separately in its pouch, keep it dry, avoid perfume and harsh chemicals, and polish gently with the SULTANÉ cloth included in your packaging.' },
  { q: 'What if my order arrives damaged or incorrect?', a: 'Message us on WhatsApp within 24 hours of receiving your order with your order number, photos or video and a description of the problem. See our Returns & Defects policy for details.' },
]

const POLICIES = {
  policy_delivery: `Free delivery within Karachi.\n\nDelivery charges apply to orders shipped elsewhere in Pakistan. The applicable charge is calculated from your delivery city and shown at checkout before you submit your order.\n\nEvery piece is made to order. The production time shown on each product page is separate from courier transit time. We will share the courier name and tracking number on WhatsApp and on your order page once your order is dispatched.`,
  policy_returns: `Because every SULTANÉ piece is made to order, we do not accept change-of-mind returns or exchanges.\n\nDefective or incorrect items\nIf your order arrives defective or is not the item you ordered, message us on WhatsApp within 24 hours of receiving it with:\n• your order number\n• clear photographs or a video of the item\n• a short description of the problem\n\nWe will review every report and arrange a suitable remedy. This policy does not limit any rights or remedies you have under applicable consumer-protection law.`,
  policy_privacy: `We collect only the information needed to make and deliver your order: your name, phone number, delivery address and, optionally, an email address. Payment receipts you upload are visible only to the SULTANÉ team and are used solely to verify your payment.\n\nYour article-number verification page shows only your name, the jewellery piece name and the purchase date. Your phone number and address are never shown publicly.\n\nWe do not sell your data. We contact you on WhatsApp about your orders and enquiries. To ask for your data to be corrected or deleted, contact us on WhatsApp.`,
  policy_terms: `Prices are in Pakistani Rupees (PKR). An order is confirmed once your bank-transfer payment has been manually verified by our team; production begins only after verification.\n\nCustomisation requests are not orders. A customised piece is only made after you approve a quotation shared on WhatsApp and pay the approved amount.\n\nMaterial and gemstone details are stated per product. "925 Sterling Silver" appears only on pieces whose material has been confirmed.`,
}

async function seed() {
  console.log('Seeding collections...')
  for (const c of collections) {
    await pool.query(
      `INSERT INTO collections (slug, name, tagline, description, position) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (slug) DO UPDATE SET name=$2, tagline=$3, description=$4, position=$5`,
      [c.slug, c.name, c.tagline, c.description, c.position],
    )
  }

  console.log(`Seeding ${products.length} products...`)
  for (const [i, p] of products.entries()) {
    const { rows } = await pool.query(
      `INSERT INTO products (sku, slug, name, category, price_pkr, description, sizes, status, production_time,
         is_bestseller, is_premium, is_mens, purity_925, material_note,
         gemstone_type, gemstone_origin, gemstone_details, testing_available, certification_info, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, updated_at=now()
       RETURNING id`,
      [
        p.sku, p.slug, p.name, p.category, p.price, p.description, p.sizes ?? null, p.status ?? 'active',
        p.production ?? '7–10 working days', !!p.bestseller, !!p.premium, !!p.mens,
        // Sample data: owner must confirm purity per product before launch.
        true, 'Silver composition confirmed by the jewellery maker for this design.',
        p.gemstone?.type ?? null, p.gemstone?.origin ?? null, p.gemstone?.details ?? null,
        !!p.premium && !!p.gemstone,
        p.gemstone ? 'Optional independent gemstone testing. Documentation is supplied by the testing service and placed in your SULTANÉ certificate sleeve.' : null,
        i,
      ],
    )
    for (const slug of p.collections) {
      await pool.query(
        `INSERT INTO product_collections (product_id, collection_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [rows[0].id, slug],
      )
    }
  }

  console.log('Seeding default settings...')
  const defaults: [string, unknown][] = [
    ['whatsapp_number', '923000000000'],
    ['delivery_fee_karachi_pkr', 0],
    ['delivery_fee_other_pkr', 350],
    ['gemstone_testing_fee_pkr', 799],
    ['bank_details', { bankName: 'Your Bank Name', accountTitle: 'SULTANÉ', accountNumber: '0000-0000000000', iban: 'PK00XXXX0000000000000000' }],
    ['hero_video_url', ''], // owner uploads the 7-second video in Site settings → Homepage,
    ['hero_poster_url', ''],
    ['loyalty_percent', 5],
    ['loyalty_valid_days', 90],
    ['announcement', 'Free delivery within Karachi · Made to order · Every piece registered with a unique article number'],
    ['about_story', 'SULTANÉ was born from a love of regal jewellery traditions — the fluid sculpture of Italy, the intricate motifs of Türkiye and the bold silhouettes of the Middle East — reimagined in silver for today.\n\nEvery piece is made to order by our jewellery maker once your payment is verified. We would rather take the time to make your piece properly than promise a dispatch date we cannot keep.\n\nEach purchased piece receives its own article number, recorded in our registry and printed on a SULTANÉ authenticity card, so the story of your jewellery stays with it.'],
    ['faqs', FAQS],
    ...Object.entries(POLICIES),
  ]
  for (const [key, value] of defaults) {
    await pool.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [key, JSON.stringify(value)])
  }

  await pool.query(
    `INSERT INTO promo_codes (code, description, kind, discount_type, discount_value, max_redemptions)
     VALUES ('WELCOME10', '10% off launch offer', 'campaign', 'percent', 10, 100) ON CONFLICT DO NOTHING`,
  )

  console.log('Seeding owner admin account...')
  const email = process.env.SEED_ADMIN_EMAIL ?? 'owner@sultane.pk'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'change-this-password'
  const hash = await bcrypt.hash(password, 10)
  await pool.query(
    `INSERT INTO admin_users (name, email, password_hash, role) VALUES ($1,$2,$3,'owner') ON CONFLICT (email) DO NOTHING`,
    ['Owner', email, hash],
  )
  console.log(`Owner account: ${email} ${password === 'change-this-password' ? '(default password — set SEED_ADMIN_PASSWORD before seeding production)' : '(password from env)'}`)

  await pool.end()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
