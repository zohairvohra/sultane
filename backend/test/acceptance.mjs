// Acceptance checks from §25 of the feasibility study, run against the live API.
// Usage: API_URL=http://localhost:4000 node test/acceptance.mjs   (against a FRESHLY SEEDED database)
const ORIGIN = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '')
const API = `${ORIGIN}/api`
let pass = 0, fail = 0
const ok = (cond, label, extra = '') => {
  if (cond) { pass++; console.log('  ✓', label) } else { fail++; console.log('  ✗', label, extra) }
}
async function call(method, path, body, token, isForm = false) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !isForm) headers['Content-Type'] = 'application/json'
  const res = await fetch(API + path, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, data }
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const pngBlob = () => new Blob([PNG], { type: 'image/png' })

console.log('\nAdmin & catalogue')
const login = await call('POST', '/auth/login', { email: 'owner@sultane.pk', password: 'change-this-password' })
ok(login.status === 200, 'owner can sign in')
const T = login.data.token
const bad = await call('GET', '/orders', null, null)
ok(bad.status === 401, 'admin routes require sign-in')

const created = await call('POST', '/products', {
  sku: 'TEST-001', name: 'Test Tennis Bracelet', category: 'Bracelets', pricePkr: 10000, productionTime: '5–7 working days',
  status: 'draft', collections: ['italia', 'turkish'], isBestseller: true, sizes: ['17 cm', '18 cm'],
}, T)
ok(created.status === 201 && created.data.collections.length === 2, 'owner adds product in multiple collections')
const pid = created.data.id
let list = await call('GET', '/products?q=Tennis')
ok(list.data.length === 0, 'draft (unpublished) product hidden from storefront')
const fd = new FormData(); fd.append('images', pngBlob(), 'a.png'); fd.append('images', pngBlob(), 'b.png')
const up = await call('POST', `/products/${pid}/images`, fd, T, true)
ok(up.status === 201 && up.data.images.length === 2, 'owner uploads product photos')
const reorder = await call('PUT', `/products/${pid}/images/order`, { imageIds: [up.data.images[1].id, up.data.images[0].id] }, T)
ok(reorder.data.images[0].id === up.data.images[1].id, 'owner reorders photos')
const img = await fetch(ORIGIN + up.data.images[0].url)
ok(img.status === 200, 'product photo served publicly')
await call('PATCH', `/products/${pid}`, { pricePkr: 12000, status: 'active' }, T)
list = await call('GET', '/products?q=Tennis')
ok(list.data.length === 1 && list.data[0].price_pkr === 12000, 'owner edits price and publishes')

console.log('\nBrowsing & filters')
const neck = await call('GET', '/products?category=Necklaces')
ok(neck.data.length > 0 && neck.data.every((p) => p.category === 'Necklaces'), 'filter by jewellery type')
const ital = await call('GET', '/products?collection=italia')
ok(ital.data.some((p) => p.id === pid) && ital.data.every((p) => p.collections.includes('italia')), 'filter by collection (multi-membership)')
const gem = await call('GET', '/products?gemstone=Emerald')
ok(gem.data.length >= 1 && gem.data.every((p) => p.gemstone_type === 'Emerald'), 'filter by gemstone')
const mens = await call('GET', '/products?mens=1&category=Chains')
ok(mens.data.length >= 1 && mens.data.every((p) => p.is_mens && p.category === 'Chains'), "Men's > Chains")
const cols = await call('GET', '/collections')
ok(cols.data.map((c) => c.slug).join() === 'italia,turkish,middle-eastern', 'exactly Italia, Turkish, Middle Eastern')
const paused = (await call('GET', '/products')).data.find((p) => p.status === 'paused')
ok(!!paused, 'paused product is visible')

console.log('\nCart, quote, testing fee, delivery')
const all = (await call('GET', '/products')).data
const premium = all.find((p) => p.is_premium && p.testing_available && !p.sizes)
const plain = all.find((p) => p.id !== pid && !p.is_premium && !p.sizes && p.status === 'active')
let q = await call('POST', '/orders/quote', { items: [{ productId: premium.id, qty: 2, gemstoneTesting: true }], city: 'Karachi' })
ok(q.data.testingFees === 799 * 2 && q.data.delivery === 0, 'Rs. 799 testing fee per piece when selected; free in Karachi')
q = await call('POST', '/orders/quote', { items: [{ productId: premium.id, qty: 1, gemstoneTesting: false }], city: 'Lahore' })
ok(q.data.testingFees === 0 && q.data.delivery === 350, 'no fee when unticked; delivery charged outside Karachi')
q = await call('POST', '/orders/quote', { items: [{ productId: plain.id, qty: 1, gemstoneTesting: true }] })
ok(q.data.testingFees === 0, 'testing cannot be added to an ineligible product')
q = await call('POST', '/orders/quote', { items: [{ productId: paused.id, qty: 1 }] })
ok(q.status === 400, 'paused product cannot be ordered')
q = await call('POST', '/orders/quote', { items: [{ productId: pid, qty: 1 }] })
ok(q.status === 400, 'size required when product has sizes')

console.log('\nPromotions')
await call('POST', '/promos', { code: 'ITALIA20', description: '20% off Italia', discountType: 'percent', discountValue: 20, collectionSlugs: ['italia'], perPhoneLimit: 1, maxRedemptions: 5 }, T)
q = await call('POST', '/orders/quote', { items: [{ productId: plain.id, qty: 1 }, { productId: pid, qty: 1, size: '17 cm' }], promoCode: 'ITALIA20' })
const italiaSub = [plain, { ...created.data, price_pkr: 12000, collections: ['italia', 'turkish'] }].filter((p) => p.collections.includes('italia')).reduce((s, p) => s + p.price_pkr, 0)
ok(q.data.promo.applied && q.data.discount === Math.round(italiaSub * 0.2), 'collection-scoped code discounts only eligible pieces', JSON.stringify(q.data))
q = await call('POST', '/orders/quote', { items: [{ productId: plain.id, qty: 1 }], promoCode: 'NOPE' })
ok(!q.data.promo.applied && q.data.discount === 0, 'unknown code rejected')
await call('POST', '/promos', { code: 'EXPIRED1', discountType: 'flat', discountValue: 500, expiresAt: new Date(Date.now() - 1000).toISOString() }, T)
q = await call('POST', '/orders/quote', { items: [{ productId: plain.id, qty: 1 }], promoCode: 'EXPIRED1' })
ok(!q.data.promo.applied, 'expired code rejected')

console.log('\nCheckout (guest) & payment proof')
const phone = '0300 1234567'
const order = await call('POST', '/orders', {
  customer: { name: 'Ayesha Khan', phone, street: 'House 1, Street 2', city: 'Karachi' },
  items: [{ productId: premium.id, qty: 2, gemstoneTesting: true }, { productId: pid, qty: 1, size: '18 cm' }],
  promoCode: 'ITALIA20', acceptPolicies: true,
})
ok(order.status === 201, 'guest places multi-item order', JSON.stringify(order.data))
const O = order.data
ok(O.orderStatus === 'awaiting-payment' && O.paymentStatus === 'awaiting', 'order starts Awaiting Payment')
ok(O.bankDetails && O.bankDetails.iban, 'bank-transfer instructions returned')
ok(O.items.find((i) => i.gemstoneTesting).testingFee === 799, 'testing choice preserved on order line')
const again = await call('POST', '/orders', {
  customer: { name: 'Ayesha Khan', phone, street: 'x street', city: 'Karachi' }, items: [{ productId: pid, qty: 1, size: '17 cm' }], promoCode: 'ITALIA20', acceptPolicies: true,
})
ok(again.status === 400, 'per-customer promo limit enforced')

let look = await call('POST', '/orders/lookup', { ref: O.ref, phone: '0300 0000000' })
ok(look.status === 404, 'tracking with wrong phone reveals nothing')
look = await call('POST', '/orders/lookup', { ref: O.ref, phone: '+92 300 1234567' })
ok(look.status === 200 && look.data.ref === O.ref, 'tracking with order no. + phone works (any phone format)')

const pf = new FormData(); pf.append('phone', phone); pf.append('proof', pngBlob(), 'receipt.png')
const proof = await call('POST', `/orders/${O.ref}/payment-proof`, pf, null, true)
ok(proof.status === 200 && proof.data.paymentStatus === 'proof-submitted', 'customer uploads payment proof')
ok(proof.data.orderStatus === 'awaiting-payment', 'uploading proof does NOT start production')
ok(proof.data.articles.length === 0, 'no article numbers before verification')
const adminOrder = (await call('GET', `/orders/admin/${O.ref}`, null, T)).data
const proofPublic = await fetch(`${ORIGIN}/uploads/${adminOrder.payment_proof_path ?? 'x'}`)
ok(adminOrder.payment_proof_path === undefined && proofPublic.status === 404, 'payment proof not publicly reachable')
const proofAdmin = await fetch(`${API}/orders/${adminOrder.id}/payment-proof`, { headers: { Authorization: `Bearer ${T}` } })
ok(proofAdmin.status === 200, 'admin can view payment proof')
const proofAnon = await fetch(`${API}/orders/${adminOrder.id}/payment-proof`)
ok(proofAnon.status === 401, 'payment proof requires admin sign-in')

console.log('\nWorkflow & article numbers')
let st = await call('PATCH', `/orders/${adminOrder.id}/status`, { orderStatus: 'in-production' }, T)
ok(st.status === 409, 'cannot enter production before payment verification')
st = await call('PATCH', `/orders/${adminOrder.id}/status`, { orderStatus: 'payment-verified' }, T)
ok(st.status === 409, 'cannot set Payment Verified without the verify action')
const flag = await call('POST', `/orders/${adminOrder.id}/flag-payment`, { note: 'Amount short by Rs. 100' }, T)
ok(flag.status === 200, 'owner can flag payment for review')
const ver = await call('POST', `/orders/${adminOrder.id}/verify-payment`, null, T)
ok(ver.status === 200 && ver.data.articleCodes.length === 3, 'verification generates one article number per piece (3 pieces)')
const codes = ver.data.articleCodes.map((c) => c.code)
ok(new Set(codes).size === 3, 'article numbers are unique')
const ver2 = await call('POST', `/orders/${adminOrder.id}/verify-payment`, null, T)
ok(ver2.status === 409, 'cannot verify twice / duplicate numbers')

const v = await call('GET', `/articles/verify/${codes[0]}`)
ok(v.status === 200 && v.data.customerName === 'Ayesha Khan' && v.data.productName && v.data.purchaseDate, 'valid number returns name, piece, date')
ok(Object.keys(v.data).sort().join() === 'code,customerName,productName,purchaseDate', 'verification exposes nothing else (no phone/address)')
const v2 = await call('GET', `/articles/verify/${codes[1].toLowerCase().replace(/-/g, '')}`)
ok(v2.status === 200, 'number accepted without dashes / lowercase (QR + typing)')
const inv = await call('GET', '/articles/verify/SLT-AAAA-BBBB-CCCC')
ok(inv.status === 404 && !JSON.stringify(inv.data).includes('Ayesha'), 'invalid number reveals nothing')

for (const s of ['in-production', 'quality-check', 'ready-for-dispatch']) await call('PATCH', `/orders/${adminOrder.id}/status`, { orderStatus: s }, T)
st = await call('PATCH', `/orders/${adminOrder.id}/status`, { orderStatus: 'dispatched' }, T)
ok(st.status === 400, 'dispatch requires courier + tracking number')
st = await call('PATCH', `/orders/${adminOrder.id}/status`, { orderStatus: 'dispatched', courierName: 'TCS', trackingNumber: 'TCS123', trackingUrl: 'https://tcs.com.pk/track?x=1', dispatchDate: '2026-11-06' }, T)
ok(st.status === 200 && st.data.order_status === 'dispatched', 'owner marks dispatched with courier details')
look = await call('POST', '/orders/lookup', { ref: O.ref, phone })
ok(look.data.courier?.trackingNumber === 'TCS123' && look.data.articles.length === 3 && !look.data.bankDetails, 'customer sees latest status, courier and article numbers')

console.log('\nLoyalty reward')
let loy = await call('POST', `/orders/${adminOrder.id}/loyalty`, null, T)
ok(loy.status === 409, 'reward only after delivery')
await call('PATCH', `/orders/${adminOrder.id}/status`, { orderStatus: 'delivered' }, T)
loy = await call('POST', `/orders/${adminOrder.id}/loyalty`, null, T)
ok(loy.status === 201 && loy.data.code.startsWith('THANKYOU-'), 'reward issued after first delivered order')
const loy2 = await call('POST', `/orders/${adminOrder.id}/loyalty`, null, T)
ok(loy2.status === 409, 'reward never issued twice for the same customer')
q = await call('POST', '/orders/quote', { items: [{ productId: plain.id, qty: 1 }], promoCode: loy.data.code, phone: '0311 9999999' })
ok(!q.data.promo.applied, 'reward code rejected for a different customer')
q = await call('POST', '/orders/quote', { items: [{ productId: plain.id, qty: 1 }], promoCode: loy.data.code, phone })
ok(q.data.promo.applied && q.data.discount === Math.round(plain.price_pkr * 0.05), '5% applied for the right customer')
const o2 = await call('POST', '/orders', { customer: { name: 'Ayesha Khan', phone, street: 'House 1', city: 'Karachi' }, items: [{ productId: plain.id, qty: 1 }], promoCode: loy.data.code, acceptPolicies: true })
ok(o2.status === 201 && o2.data.discount > 0, 'reward redeemed on next order')
q = await call('POST', '/orders/quote', { items: [{ productId: plain.id, qty: 1 }], promoCode: loy.data.code, phone })
ok(!q.data.promo.applied, 'reward cannot be redeemed twice')

console.log('\nCustomisation')
const ef = new FormData(); ef.append('type', 'customize'); ef.append('productId', premium.id); ef.append('name', 'Sara'); ef.append('phone', '03211234567'); ef.append('description', 'Please use a thicker rope chain, 20 inches.')
const enq = await call('POST', '/enquiries', ef, null, true)
ok(enq.status === 201, 'customer requests modification (no order, no payment)')
const nf = new FormData(); nf.append('type', 'new-design'); nf.append('name', 'Sara'); nf.append('phone', '03211234567'); nf.append('description', 'A crescent pendant like this photo')
ok((await call('POST', '/enquiries', nf, null, true)).status === 400, 'new design requires an inspiration image')
nf.append('files', pngBlob(), 'inspo.png')
ok((await call('POST', '/enquiries', nf, null, true)).status === 201, 'customer submits inspiration image')
const enqList = (await call('GET', '/enquiries', null, T)).data
ok(enqList.length === 2, 'owner sees custom requests')
const enqDetail = (await call('GET', `/enquiries/${enqList[0].ref}`, null, T)).data
const file = await fetch(`${API}/enquiries/files/${enqDetail.files[0].id}`, { headers: { Authorization: `Bearer ${T}` } })
ok(file.status === 200, 'owner views reference image (private)')
const conv = await call('POST', `/enquiries/${enqList[0].id}/convert`, { pricePkr: 55000, title: 'Custom crescent pendant', street: 'Flat 4', city: 'Lahore' }, T)
ok(conv.status === 201, 'approved quote becomes an order')
const co = (await call('GET', `/orders/admin/${conv.data.ref}`, null, T)).data
ok(co.order_status === 'pending-price' && co.delivery_pkr === 350, 'custom order starts Pending Price')
ok((await call('POST', `/orders/${co.id}/verify-payment`, null, T)).status === 409, 'cannot verify while Pending Price')

console.log('\nCustomer accounts')
const reg = await call('POST', '/auth/customer/register', { name: 'Bilal', phone: '0333 7654321', password: 'password123' })
ok(reg.status === 201, 'customer registers (optional)')
const co3 = await call('POST', '/orders', { customer: { name: 'Bilal', phone: '0333 7654321', street: 'Street 9', city: 'Islamabad' }, items: [{ productId: plain.id, qty: 1 }], acceptPolicies: true }, reg.data.token)
const mine = await call('GET', '/orders/mine', null, reg.data.token)
ok(co3.status === 201 && mine.data.length === 1 && mine.data[0].ref === co3.data.ref, 'signed-in customer sees order history')

console.log('\nReports')
const rep = (await call('GET', '/reports/summary', null, T)).data
const verifiedTotal = O.total
ok(rep.verifiedRevenuePkr === verifiedTotal, 'revenue counts only verified payments', `${rep.verifiedRevenuePkr} vs ${verifiedTotal}`)
ok(rep.outstanding.count >= 2, 'unverified orders reported as outstanding')

console.log('\nSecurity')
const sset = await call('PUT', '/settings/whatsapp_number', { value: 'abc' }, T)
ok(sset.status === 400, 'settings are validated')
const unknown = await call('PUT', '/settings/evil', { value: 1 }, T)
ok(unknown.status === 400, 'unknown settings rejected')
let limited = false
for (let i = 0; i < 12; i++) if ((await call('GET', '/articles/verify/SLT-ZZZZ-ZZZZ-ZZZZ')).status === 429) limited = true
ok(limited, 'verification attempts are rate-limited')
const tamper = await call('POST', '/orders', { customer: { name: 'X Y', phone: '03001112223', street: 'abc', city: 'Karachi' }, items: [{ productId: plain.id, qty: 1, price: 1 }], acceptPolicies: true })
ok(tamper.status !== 201 || tamper.data.total === plain.price_pkr, 'client cannot dictate prices')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
