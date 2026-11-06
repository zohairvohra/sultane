import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5174'
const OUT = '/private/tmp/claude-501/-Users-2-Desktop-Sultane/31afd9a0-aeb8-413a-974b-d7b57dd5c560/scratchpad/shots-live'
mkdirSync(OUT, { recursive: true })

const errors = []
const log = (...a) => console.log(...a)

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`) })
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
page.on('response', (res) => {
  if (res.url().includes('/api/') && res.status() >= 400) errors.push(`[http ${res.status()}] ${res.url()}`)
})

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
}
async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
}
async function step(name, fn) {
  try {
    await fn()
    log('OK  ', name)
  } catch (e) {
    errors.push(`[step:${name}] ${e.message}`)
    log('FAIL', name, '-', e.message.split('\n')[0])
  }
}

let orderRef = ''

await step('home shows real bestsellers from API', async () => {
  await go('/')
  await page.waitForSelector('text=Luna sculpted ring', { timeout: 10000 })
  await shot('01-home-live')
})

await step('shop lists all 24 live products', async () => {
  await go('/shop')
  await page.waitForSelector('text=Objects of expression')
  await page.waitForSelector('text=24 sample pieces')
  await shot('02-shop-live')
})

await step('product detail loads live data and adds to bag', async () => {
  await go('/product/luna-sculpted-ring')
  await page.waitForSelector('text=Luna sculpted ring')
  await page.waitForSelector('text=PKR 18,500')
  await page.click('button:has-text("Add to bag")')
  await page.waitForTimeout(300)
  await shot('03-product-live')
})

await step('cart shows live item', async () => {
  await page.click('a[aria-label="Shopping bag"]')
  await page.waitForSelector('text=Luna sculpted ring')
  await shot('04-cart-live')
})

await step('checkout creates a real order via the API (bank transfer)', async () => {
  await page.click('text=Continue as guest')
  await page.waitForSelector('text=Make it yours.')
  await page.fill('input[type="email"]', 'liveamina@example.com')
  await page.fill('input[type="tel"]', '+923001234567')
  await page.locator('input').nth(2).fill('Live')
  await page.locator('input').nth(3).fill('Amina')
  await page.fill('input[placeholder="House 12, Sample Lane"]', 'House 99, Live Lane')
  await page.locator('select').first().selectOption({ label: 'Lahore, Punjab' })
  await page.locator('input[type="radio"]').nth(1).click()
  await page.check('input[type="checkbox"] >> nth=0')
  await shot('05-checkout-live')
  await page.click('button:has-text("Place bank transfer order")')
  await page.waitForSelector('text=Thank you,', { timeout: 10000 })
  const refText = await page.locator('text=/SLT-\\d{4}-\\d+/').first().textContent()
  orderRef = refText.trim()
  await shot('06-confirmation-live')
})

await step('order confirmation ref matches backend SLT-YYYY-###### format', async () => {
  if (!/^SLT-\d{4}-\d{6}$/.test(orderRef)) throw new Error(`Unexpected ref format: ${orderRef}`)
})

await step('customize-existing-design submits a real enquiry', async () => {
  await go('/customize/mehra-drop-earrings')
  await page.waitForSelector('text=Make it truly yours.')
  await page.fill('input', 'Live Tester') // first text input = Full name
  const inputs = await page.locator('input').all()
  await inputs[1].fill('+923009998888')
  await page.fill('textarea', 'Please shorten the drop length by 2cm.')
  await page.check('input[type="checkbox"]')
  await page.click('button:has-text("Save my customisation request")')
  await page.waitForSelector('text=has a place to begin', { timeout: 10000 })
  await shot('07-customize-confirm-live')
})

await step('new custom design submits a real enquiry', async () => {
  await go('/custom-jewellery')
  await page.waitForSelector('text=Begin with an idea.')
  const inputs = await page.locator('input').all()
  await inputs[0].fill('Live Tester Two')
  await inputs[1].fill('+923007776666')
  await page.check('input[type="checkbox"]')
  await page.click('button:has-text("Save my custom request")')
  await page.waitForSelector('text=has a place to begin', { timeout: 10000 })
  await shot('08-new-design-confirm-live')
})

await step('customer submits payment proof via the API (no UI built yet for this step)', async () => {
  const fd = new FormData()
  const fakeImage = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0, 0, 0, 0])], { type: 'image/jpeg' })
  fd.append('proof', fakeImage, 'receipt.jpg')
  const res = await fetch(`http://localhost:4000/api/orders/${orderRef}/payment-proof`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`payment-proof upload failed: ${res.status}`)
  const body = await res.json()
  if (body.payment_status !== 'pending-review') throw new Error(`expected pending-review, got ${body.payment_status}`)
})

await step('verify page rejects an unknown code via live API', async () => {
  await go('/verify/result?code=SLT-0000-0000-0000')
  await page.waitForSelector("text=We couldn", { timeout: 10000 })
  await shot('09-verify-notfound-live')
})

await step('admin routes redirect to login when unauthenticated', async () => {
  await go('/admin/orders')
  await page.waitForSelector('text=Sign in', { timeout: 10000 })
  await shot('10-admin-login-redirect')
})

await step('admin can log in with seeded owner account', async () => {
  await page.fill('input[type="email"]', 'owner@sultane.pk')
  await page.fill('input[type="password"]', 'change-this-password')
  await page.click('button:has-text("Sign in")')
  await page.waitForSelector('text=Orders, at a glance.', { timeout: 10000 })
  await shot('11-admin-orders-live')
})

await step('admin orders list includes the order just placed', async () => {
  await page.waitForSelector(`text=${orderRef}`, { timeout: 10000 })
  await page.click(`text=${orderRef}`)
  await page.waitForSelector('text=Selected order')
  await shot('12-admin-order-selected-live')
})

let generatedCode = ''
await step('admin verifies bank-transfer payment, generating article codes', async () => {
  await page.click('button:has-text("Mark payment verified")')
  await page.waitForSelector('text=Article code', { timeout: 10000 })
  const noteText = await page.locator('text=Article code').first().textContent()
  const match = noteText.match(/SLT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)
  if (!match) throw new Error(`Could not find generated code in: ${noteText}`)
  generatedCode = match[0]
  await shot('13-admin-payment-verified-live')
})

await step('order status moved to Preparing after verification', async () => {
  await page.waitForSelector('text=Preparing', { timeout: 10000 })
})

await step('newly generated article code resolves on the public verify page', async () => {
  await go(`/verify/result?code=${generatedCode}`)
  await page.waitForSelector('text=This code matches our records', { timeout: 10000 })
  await page.waitForSelector('text=Luna sculpted ring')
  await page.waitForSelector('text=Live Amina')
  await shot('14-verify-live-match')
})

await step('admin enquiries list includes both live submissions', async () => {
  await go('/admin/enquiries')
  await page.waitForSelector('text=Ideas, ready for a conversation.')
  await page.waitForSelector('text=Live Tester')
  await page.waitForSelector('text=Live Tester Two')
  await shot('15-admin-enquiries-live')
})

await step('admin can advance an enquiry status', async () => {
  await page.click('text=Live Tester Two')
  await page.waitForSelector('button:has-text("Move to")')
  await page.click('button:has-text("Move to")')
  await page.waitForSelector('text=Contacted', { timeout: 10000 })
  await shot('16-admin-enquiry-advanced-live')
})

await browser.close()

console.log('\n=== ERRORS ===')
if (errors.length === 0) console.log('none')
else errors.forEach((e) => console.log(e))
console.log('\norderRef:', orderRef, '| generatedCode:', generatedCode)
