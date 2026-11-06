# SULTANÉ backend

Express + PostgreSQL API for the SULTANÉ storefront and owner dashboard. Schema, migrations, and seed data live in the sibling `../database` package, not here — see that README for setup order.

## Setup

```bash
npm install
cp .env.example .env     # edit DATABASE_URL, JWT_SECRET, etc.
npm run migrate          # passthrough to ../database (creates all tables, idempotent)
npm run seed             # passthrough to ../database (sample catalogue, settings, one owner account)
npm run dev               # http://localhost:4000
```

The seed script (run from here or directly in `../database`) prints the owner login it created — default `owner@sultane.pk` / `change-this-password` — **change this before any real deployment**.

## What's implemented

- **Catalogue** — `GET /api/products`, `GET /api/products/:slug`, admin create/update (publish, pause, edit price/lead time).
- **Checkout** — `POST /api/orders`. Prices, delivery fee and discounts are all recomputed server-side from the database; the client cannot dictate totals.
- **Payment verification gate** — `PATCH /api/orders/:id/status` refuses to move a bank-transfer order into production (`preparing` and later) until `POST /api/orders/:id/verify-payment` has been called. COD orders aren't blocked the same way since cash is collected on delivery, matching the business workflow.
- **Article registry** — `verify-payment` generates one unique code *per physical piece* (qty > 1 on a line gets multiple codes, never one code shared across units). `GET /api/articles/:code` is public, rate-limited, and returns only product name/collection/SKU/variant/customer name/purchase date — never phone, email, or address. Unknown codes get a generic 404.
- **Customisation enquiries** — one table for both "modify an existing design" and "entirely new design" requests (`type` column), with private staff-only reference image uploads.
- **Promo codes** — validation, redemption counting, admin create/disable. The 5%-next-order loyalty reward has a dedicated `loyalty_rewards` table with a unique constraint on customer phone, so it can't be issued twice to the same person.
- **Order tracking** — `GET /api/orders/track/:ref?phone=...` requires the phone number on file, so a bare reference number can't be used to pull up someone else's order.
- **Reports** — `GET /api/reports/summary` (admin). Revenue only counts orders with a *verified* payment; unpaid/pending orders are reported separately, never counted as revenue.
- **Auth** — JWT-based admin login. All `/admin`-facing routes require `Authorization: Bearer <token>`.

Every route above was exercised with real `curl` requests against a live PostgreSQL database during development, not just type-checked. The React frontend (`../frontend`) is wired to this API end-to-end — see its README for the matching integration test, which drives both apps together through a real checkout, admin login, payment verification, and article lookup against this live backend.

## What's deliberately out of scope for this pass

- **No payment-proof upload UI in the storefront yet.** The API supports it (`POST /api/orders/:ref/payment-proof`), and the admin dashboard correctly refuses to show "verify payment" until an order's `payment_status` reaches `pending-review` — but nothing in the customer-facing site currently calls that endpoint. Right now a bank-transfer order sits at `unpaid` until proof is submitted some other way (e.g. WhatsApp, with staff uploading it on the customer's behalf via the same endpoint). Building that upload screen is the next real gap to close.
- **File storage is local disk** (`./uploads`, served statically). Fine for development; for production, move to S3/Cloudinary/等 with signed URLs, and put payment-proof files behind an authenticated route rather than static hosting (right now anyone with the URL can view a proof image — acceptable for a concept build, not for launch).
- **Rate limiting is in-memory** (see `src/middleware/rateLimit.ts`), which only works correctly behind a single server instance. Swap for a Redis-backed limiter before scaling horizontally.
- **No automated tests.** Routes were verified manually end-to-end; a real launch should have integration tests around the payment-verification gate and article-code generation specifically, since those are the two places a bug would have real business consequences.
- **No WhatsApp/courier API integrations** — matches the requirements doc, which explicitly scopes these out for launch (manual WhatsApp messaging, manual courier booking).
- **Admin catalogue/registry/settings screens are placeholders.** `AdminOrders` and `AdminEnquiries` are fully live; `AdminPlaceholder` stands in for the catalogue, article-registry, and settings dashboards the API already supports (`POST/PATCH /api/products`, `GET /api/articles`, `GET/PUT /api/settings`) but that don't have a UI yet.

## Project layout

```
src/
  db/          pool.ts (query client), settings.ts — runtime DB access used by routes
  middleware/  auth (JWT), upload (multer), rate limiting, error handling
  routes/      one file per resource (products, orders, enquiries, articles, promos, settings, reports, auth)
  utils/       order ref / enquiry ref / article code generators
uploads/       payment proofs and enquiry reference images (local disk, dev only)
```

Schema ownership (`schema.sql`, `migrate.ts`, `seed.ts`) deliberately lives outside this package, in `../database` — this package only holds the query client (`src/db/pool.ts`) it needs at request time.
