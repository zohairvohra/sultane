# SULTANÉ — storefront + admin

React + TypeScript + Tailwind frontend for SULTANÉ, built from the brand's wireframe mockup. Talks to the Express/PostgreSQL API in `../backend`.

## Setup

```bash
npm install
cp .env.example .env     # VITE_API_URL, defaults to http://localhost:4000/api
npm run dev               # http://localhost:5173 (or next free port)
```

Requires the API running — see `../database/README.md` and `../backend/README.md` to get PostgreSQL migrated and seeded first; nothing in this app will load data without it.

## What's here

- **Storefront**: homepage, shop with filters, product detail, cart, checkout (COD / bank transfer), order confirmation, "customise this design" and "begin with an idea" enquiry forms with image upload, article verification lookup, order tracking.
- **Admin** (`/admin/login`): JWT-authenticated owner dashboard for orders (status workflow, payment verification, article-code generation) and custom enquiries (status pipeline, WhatsApp/email actions, private reference images).
- All catalogue, cart, checkout, enquiry, verification, and admin data is fetched live from the API — nothing is hardcoded mock data. See `src/lib/api.ts` for the full client.

## Verifying the integration

Two Playwright scripts exist for driving the real app (not just type-checking it):

```bash
npm install  # installs playwright as a devDependency
node verify-app.mjs          # UI-only smoke test (doesn't require the API)
node verify-integration.mjs  # full live run — both servers must be up, drives
                              # browse → checkout → payment-proof → admin login →
                              # verify payment → article lookup → enquiry pipeline
```

`verify-integration.mjs` is the one that actually proves the frontend and backend
agree with each other — it was run repeatedly during development and caught two
real integration bugs (a checkout-navigation race and a missing payment-proof
upload step) before they shipped.

## Known gaps

- **No payment-proof upload screen.** The API supports it; nothing in the UI calls it yet, so bank-transfer orders currently need proof submitted another way (see `../backend/README.md`).
- **Cart is in-memory only** — it resets on a hard page refresh (not on client-side navigation). Fine for a single checkout session; add `localStorage` persistence if customers need to resume a cart across visits.
- **Admin catalogue / article registry / settings screens are placeholders** (`AdminPlaceholder`) — the API endpoints exist, the UI doesn't yet.
