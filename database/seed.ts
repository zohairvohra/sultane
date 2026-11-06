import bcrypt from 'bcryptjs'
import { pool } from './pool'

const collections = [
  { slug: 'italia', name: 'Italia', tagline: 'Fluid lines, sculptural ease.', description: 'Soft, poured silhouettes inspired by Italian sculptural form.' },
  { slug: 'bharat', name: 'Bharat', tagline: 'Ornament with a lyrical rhythm.', description: 'Intricate filigree and drop forms drawing on South Asian ornament traditions.' },
  { slug: 'turkish', name: 'Turkish', tagline: 'Intricate motifs, reimagined.', description: 'Medallion and motif work inspired by Turkish decorative arts.' },
  { slug: 'middle-eastern', name: 'Middle Eastern', tagline: 'Bold forms, luminous presence.', description: 'Confident, sculptural silhouettes with a hammered or brushed finish.' },
  { slug: 'moroccan', name: 'Moroccan', tagline: 'Geometry in a softer light.', description: 'Lattice and geometric detailing inspired by Moroccan pattern work.' },
]

const products = [
  { sku: 'IT-LUN-01', slug: 'luna-sculpted-ring', name: 'Luna sculpted ring', collection_slug: 'italia', category: 'Rings', price_pkr: 18500, description: 'A fluid crescent, a luminous surface. Luna brings a sculptural point of view to the everyday ring.', sizes: ['14', '16', '18', '20'], production_days: '5–7 working days', is_bestseller: true, purity_925: true },
  { sku: 'BH-MHR-01', slug: 'mehra-drop-earrings', name: 'Mehra drop earrings', collection_slug: 'bharat', category: 'Earrings', price_pkr: 24000, description: 'Chandelier drops with fine filigree detail and a soft, lyrical rhythm.', production_days: '7–10 working days', is_bestseller: true, purity_925: true },
  { sku: 'TR-AYL-01', slug: 'ayla-medallion-pendant', name: 'Ayla medallion pendant', collection_slug: 'turkish', category: 'Pendants', price_pkr: 16800, description: 'An intricate medallion motif suspended on a fine chain.', production_days: '5–7 working days', is_bestseller: true, purity_925: true },
  { sku: 'ME-NOR-01', slug: 'noor-open-cuff', name: 'Noor open cuff', collection_slug: 'middle-eastern', category: 'Bracelets', price_pkr: 29500, description: 'A hammered, luminous cuff with bold presence and an adjustable open back.', production_days: '7–10 working days', is_bestseller: true, purity_925: true },
  { sku: 'MO-ZAY-01', slug: 'zaya-lattice-ring', name: 'Zaya lattice ring', collection_slug: 'moroccan', category: 'Rings', price_pkr: 15200, description: 'Geometric lattice work wrapped in a soft, wearable band.', sizes: ['14', '16', '18', '20'], production_days: '5–7 working days', purity_925: true },
  { sku: 'IT-SRA-01', slug: 'sera-link-chain', name: 'Sera link chain', collection_slug: 'italia', category: 'Chains', price_pkr: 21000, description: 'A fluid paperclip-link chain designed to layer or wear alone.', production_days: '5–7 working days', purity_925: true },
  { sku: 'ME-SHR-01', slug: 'sahar-collar-necklace', name: 'Sahar collar necklace', collection_slug: 'middle-eastern', category: 'Necklaces', price_pkr: 38000, description: 'A bold collar silhouette with a brushed, luminous finish.', production_days: '10–14 working days', is_premium: true, has_gemstone: true, purity_925: true },
  { sku: 'BH-INY-01', slug: 'inaya-petal-studs', name: 'Inaya petal studs', collection_slug: 'bharat', category: 'Earrings', price_pkr: 12500, description: 'Small sculpted petal studs for everyday wear.', production_days: '5–7 working days', purity_925: true },
  { sku: 'MO-AML-01', slug: 'amal-woven-bracelet', name: 'Amal woven bracelet', collection_slug: 'moroccan', category: 'Bracelets', price_pkr: 22000, description: 'A finely woven chain bracelet with a geometric clasp detail.', availability: 'enquire', production_days: '14–18 working days', purity_925: true },
  { sku: 'TR-FRZ-01', slug: 'firuze-drop-chain', name: 'Firuze drop chain', collection_slug: 'turkish', category: 'Chains', price_pkr: 26500, description: 'An intricate motif-drop chain inspired by Turkish decorative work.', production_days: '7–10 working days', purity_925: true },
  { sku: 'IT-VLA-01', slug: 'vela-wave-cuff', name: 'Vela wave cuff', collection_slug: 'italia', category: 'Bracelets', price_pkr: 19800, description: 'A sculptural, sinuous cuff with a mirror-polished finish.', production_days: '5–7 working days', purity_925: true },
  { sku: 'ME-RAN-01', slug: 'rana-dome-ring', name: 'Rana dome ring', collection_slug: 'middle-eastern', category: 'Rings', price_pkr: 17200, description: 'A bold, hammered dome ring with a luminous presence.', sizes: ['14', '16', '18', '20'], production_days: '5–7 working days', purity_925: true },
  { sku: 'BH-KIR-01', slug: 'kiran-chandbali-earrings', name: 'Kiran chandbali earrings', collection_slug: 'bharat', category: 'Earrings', price_pkr: 27500, description: 'Crescent-form chandbali earrings with fine granulation detail.', production_days: '10–14 working days', is_premium: true, has_gemstone: true, purity_925: true },
  { sku: 'MO-NAD-01', slug: 'nadia-lattice-pendant', name: 'Nadia lattice pendant', collection_slug: 'moroccan', category: 'Pendants', price_pkr: 18200, description: 'A softened geometric lattice pendant on a fine chain.', production_days: '5–7 working days', purity_925: true },
  { sku: 'TR-ELF-01', slug: 'elif-link-bracelet', name: 'Elif link bracelet', collection_slug: 'turkish', category: 'Bracelets', price_pkr: 20500, description: 'A refined link bracelet with a reimagined motif clasp.', production_days: '5–7 working days', purity_925: true },
  { sku: 'IT-COR-01', slug: 'corso-bar-necklace', name: 'Corso bar necklace', collection_slug: 'italia', category: 'Necklaces', price_pkr: 23500, description: 'A minimal sculptural bar pendant on a fine curb chain.', production_days: '5–7 working days', purity_925: true },
  { sku: 'ME-LAY-01', slug: 'layla-statement-necklace', name: 'Layla statement necklace', collection_slug: 'middle-eastern', category: 'Necklaces', price_pkr: 42000, description: 'A bold, brushed statement necklace with a luminous gemstone centrepiece.', production_days: '14–18 working days', is_premium: true, has_gemstone: true, purity_925: true },
  { sku: 'BH-ANJ-01', slug: 'anjali-filigree-ring', name: 'Anjali filigree ring', collection_slug: 'bharat', category: 'Rings', price_pkr: 16200, description: 'Delicate filigree work on a slender, comfortable band.', sizes: ['14', '16', '18', '20'], production_days: '5–7 working days', purity_925: true },
  { sku: 'MO-RIM-01', slug: 'rim-geometric-studs', name: 'Rim geometric studs', collection_slug: 'moroccan', category: 'Earrings', price_pkr: 11800, description: 'Small geometric studs with a softened lattice outline.', production_days: '5–7 working days', purity_925: true },
  { sku: 'TR-ESM-01', slug: 'esma-medallion-ring', name: 'Esma medallion ring', collection_slug: 'turkish', category: 'Rings', price_pkr: 19200, description: 'A miniature medallion motif set into a comfortable band.', sizes: ['14', '16', '18', '20'], production_days: '5–7 working days', purity_925: true },
  { sku: 'IT-ONA-01', slug: 'onda-chain-necklace', name: 'Onda chain necklace', collection_slug: 'italia', category: 'Necklaces', price_pkr: 25500, description: 'A wave-link chain necklace with a soft, sculptural movement.', production_days: '5–7 working days', purity_925: true },
  { sku: 'ME-SAF-01', slug: 'safiya-cuff-bracelet', name: 'Safiya cuff bracelet', collection_slug: 'middle-eastern', category: 'Bracelets', price_pkr: 24800, description: 'A brushed, bold cuff bracelet with a luminous open finish.', availability: 'enquire', production_days: '14–18 working days', purity_925: true },
  { sku: 'BH-TARA-01', slug: 'tara-drop-pendant', name: 'Tara drop pendant', collection_slug: 'bharat', category: 'Pendants', price_pkr: 21500, description: 'A lyrical teardrop pendant with fine granulated edging.', production_days: '7–10 working days', is_premium: true, has_gemstone: true, purity_925: true },
  { sku: 'MO-YASM-01', slug: 'yasmin-lattice-chain', name: 'Yasmin lattice chain', collection_slug: 'moroccan', category: 'Chains', price_pkr: 27000, description: 'A geometric lattice-link chain softened for everyday layering.', production_days: '7–10 working days', purity_925: true },
]

async function seed() {
  console.log('Seeding collections...')
  for (const c of collections) {
    await pool.query(
      `INSERT INTO collections (slug, name, tagline, description) VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO UPDATE SET name=$2, tagline=$3, description=$4`,
      [c.slug, c.name, c.tagline, c.description],
    )
  }

  console.log(`Seeding ${products.length} products...`)
  for (const p of products) {
    await pool.query(
      `INSERT INTO products (sku, slug, name, collection_slug, category, price_pkr, description, sizes, availability, production_days, is_bestseller, is_premium, has_gemstone, purity_925)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (sku) DO UPDATE SET
         name=$3, collection_slug=$4, category=$5, price_pkr=$6, description=$7, sizes=$8,
         availability=$9, production_days=$10, is_bestseller=$11, is_premium=$12, has_gemstone=$13, purity_925=$14, updated_at=now()`,
      [
        p.sku, p.slug, p.name, p.collection_slug, p.category, p.price_pkr, p.description,
        p.sizes ?? null, p.availability ?? 'available', p.production_days,
        !!p.is_bestseller, !!p.is_premium, !!p.has_gemstone, !!p.purity_925,
      ],
    )
  }

  console.log('Seeding default settings...')
  const defaults: [string, unknown][] = [
    ['whatsapp_number', '923000000000'],
    ['delivery_fee_default_pkr', 350],
    ['delivery_fee_karachi_pkr', 0],
    ['delivery_fee_other_pkr', 450],
    ['gemstone_testing_fee_pkr', 799],
  ]
  for (const [key, value] of defaults) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(value)],
    )
  }

  console.log('Seeding owner admin account...')
  const email = process.env.SEED_ADMIN_EMAIL ?? 'owner@sultane.pk'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'change-this-password'
  const hash = await bcrypt.hash(password, 10)
  await pool.query(
    `INSERT INTO admin_users (name, email, password_hash, role) VALUES ($1,$2,$3,'owner')
     ON CONFLICT (email) DO NOTHING`,
    ['Ayesha', email, hash],
  )
  console.log(`Owner account: ${email} / ${password === 'change-this-password' ? '(default password — set SEED_ADMIN_PASSWORD env var before seeding production)' : '(from env)'}`)

  await pool.end()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
