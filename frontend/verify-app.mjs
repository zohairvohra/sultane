import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5174'
const OUT = '/private/tmp/claude-501/-Users-2-Desktop-Sultane/31afd9a0-aeb8-413a-974b-d7b57dd5c560/scratchpad/shots'
mkdirSync(OUT, { recursive: true })

const errors = []

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot:', name, '| url:', page.url())
}

async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
}

async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    errors.push(`[step:${name}] ${e.message}`)
    console.log('FAILED step:', name, '-', e.message.split('\n')[0])
  }
}

// Homepage
await go('/')
await page.waitForSelector('text=Silver.')
await shot('01-home')

// Shop
await go('/shop')
await page.waitForSelector('text=Objects of expression')
await shot('02-shop')

// Product detail
await go('/product/luna-sculpted-ring')
await page.waitForSelector('text=Luna sculpted ring')
await page.click('button:has-text("Add to bag")')
await page.waitForTimeout(300)
await shot('03-product')

// Cart
await go('/cart')
await page.waitForSelector('text=A little something, for you.')
await shot('04-cart')

// Checkout
await page.click('text=Continue as guest')
await page.waitForSelector('text=Make it yours.')
await page.fill('input[type="email"]', 'amina@example.com')
await page.fill('input[type="tel"]', '+92 300 0000000')
await page.locator('input').nth(2).fill('Amina')
await page.locator('input').nth(3).fill('Noor')
await page.fill('input[placeholder="House 12, Sample Lane"]', 'House 12, Sample Lane')
await page.fill('input[placeholder="Gulberg III"]', 'Gulberg III')
await page.locator('select').first().selectOption({ label: 'Lahore, Punjab' })
await page.check('input[type="checkbox"] >> nth=0')
await shot('05-checkout-filled')

await step('submit-checkout', async () => {
  await page.click('button:has-text("Place COD order")')
  await page.waitForSelector('text=Thank you,', { timeout: 8000 })
})
await shot('06-order-confirmation')

// Customize existing design
await go('/customize/luna-sculpted-ring')
await page.waitForSelector('text=Make it truly yours.')
await shot('07-customize-existing')

// New custom design
await go('/custom-jewellery')
await page.waitForSelector('text=Begin with an idea.')
await shot('08-new-custom-design')

// Verify lookup
await go('/verify')
await page.waitForSelector('text=Look up an article code.')
await page.fill('input[placeholder="SLT-7K4M-Q9XD-2HRB"]', 'SLT-7K4M-Q9XD-2HRB')
await shot('09-verify-form')
await page.click('button:has-text("Look up code")')
await step('verify-result', async () => {
  await page.waitForSelector('text=This code matches our records', { timeout: 8000 })
})
await shot('10-verify-result')

// Verify invalid
await go('/verify/result?code=SLT-BAD-CODE')
await step('verify-invalid', async () => {
  await page.waitForSelector("text=We couldn", { timeout: 8000 })
})
await shot('11-verify-invalid')

// Admin orders
await go('/admin/orders')
await page.waitForSelector('text=Orders, at a glance.')
await shot('12-admin-orders')

// Admin enquiries
await go('/admin/enquiries')
await page.waitForSelector('text=Ideas, ready for a conversation.')
await shot('13-admin-enquiries')

// Mobile check of homepage
await page.setViewportSize({ width: 390, height: 844 })
await go('/')
await page.waitForSelector('text=Silver.')
await shot('14-home-mobile')

await browser.close()

console.log('\n=== CONSOLE/PAGE/STEP ERRORS ===')
if (errors.length === 0) console.log('none')
else errors.forEach((e) => console.log(e))
