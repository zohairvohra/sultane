---
title: Sultane Luxury Jewellery
emoji: 💍
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# SULTANÉ

Luxury silver jewellery e-commerce for Pakistan (English, PKR), built to the **SULTANÉ Website Feasibility Study & Developer Requirements** (v2). React storefront + owner dashboard, Express API, PostgreSQL.

```
frontend/    React + TypeScript + Tailwind storefront and owner dashboard
backend/     Express + TypeScript API (routes, auth, uploads, acceptance tests)
database/    PostgreSQL schema, reset/migrate, seed data — no app code
```

## Run it locally

```bash
# 1. Database — one-time setup (DATABASE_URL must point at an existing, UTF-8 database)
cd database && npm install && cp .env.example .env
npm run migrate && npm run seed

# 2. API
cd backend && npm install && cp .env.example .env   # set JWT_SECRET to a long random string
npm run dev          # http://localhost:4000

# 3. Storefront
cd frontend && npm install && cp .env.example .env
npm run dev          # http://localhost:5173
```

Owner dashboard: `/admin/login` — the seed prints the owner login (default `owner@sultane.pk` / `change-this-password`; set `SEED_ADMIN_PASSWORD` before seeding anything real, and change it in **Site settings → Account**).

> **Upgrading an existing v1 database:** the v2 schema is not compatible with the first prototype's tables (5 collections, COD, etc.). Run `npm run reset && npm run seed` in `database/` — this **deletes all data**, which is fine pre-launch. On the Hugging Face Space, restart with a fresh persistent volume so `start.sh` initialises the new schema.

## What the site does (feasibility study → implementation)

| Requirement | Where |
|---|---|
| Baby pink / silver / rose gold / black luxury identity | `frontend/src/index.css` tokens, `Wordmark`, rose-gold accents |
| 7-second hero video: muted autoplay loop, sound toggle, fallback image, wordmark + Shop Now | `HeroVideo.tsx`; owner uploads it in **Site settings → Homepage** |
| Homepage: Bestsellers, Premium, Men's, Customise, Story, collection tiles, footer | `pages/Home.tsx` |
| Nav: Necklaces, Earrings, Bracelets, Men's (Chains/Rings/Bracelets), Rings, Collections (Italia/Turkish/Middle Eastern), Premium, Customized Jewellery, About Us + search, account, cart, **Verify Your Piece** | `components/Header.tsx` |
| Products in several places at once; filters by type, collection, gemstone | `product_collections` table, `pages/Shop.tsx` |
| Made-to-order: publish / pause / unpublish, per-product production time, no stock counts | `products.status`, `production_time` |
| “925 Sterling Silver” tag only when confirmed per product | `products.purity_925` |
| Premium gemstone details + optional **Rs. 799** testing, ticked by default, saved on the order | product page, `order_items.gemstone_testing` / `testing_fee_pkr` |
| Buy the original vs. **Customise This Design — Request Price** (never priced in the cart) | `ProductDetail.tsx`, `CustomizeExisting.tsx` |
| New design from an inspiration image → WhatsApp | `NewCustomDesign.tsx`, `EnquiryConfirmation.tsx` |
| Guest checkout + optional accounts with order history | `Checkout.tsx`, `Account.tsx` |
| Bank transfer only; receipt upload; manual verify / flag; upload never starts production | `orders.ts` (`payment-proof`, `verify-payment`, `flag-payment`) |
| One unique article number **per piece**, created only on verification; QR authenticity cards | `verify-payment`, **Article registry** (print cards) |
| Verify page shows only name, piece, purchase date; rate-limited; invalid numbers reveal nothing | `articles.ts`, `pages/Verify.tsx` (`/verify/:code` is the QR target) |
| Status workflow Pending Price → … → Delivered with enforced transitions; courier, tracking no., date, link | `orders.ts` `TRANSITIONS`, admin order page |
| Secure tracking (order no. + phone), WhatsApp update templates | `TrackOrder.tsx`, admin order page |
| Free Karachi delivery, configurable charge elsewhere | **Site settings → Store** |
| Promo codes: dates, limits, per-customer limits, min order, collection/product scope | **Promotions & rewards** |
| 5% next-order reward: after first delivered order, once per customer, bound to their phone | `POST /orders/:id/loyalty`, `loyalty_rewards` |
| FAQs, delivery / returns & defects / privacy / terms — editable | **Site settings → Story & FAQs / Policies** |
| Reports: verified revenue vs outstanding, pipeline, bestsellers, promo usage | **Overview** |
| No reviews, no testimonials, no abandoned-cart messages | intentionally absent |

## Verifying it works

`backend/test/acceptance.mjs` runs 71 checks mapped to §25 *Acceptance Criteria* against a running API and a **freshly seeded** database:

```bash
cd database && npm run reset && npm run seed
cd ../backend && npm run dev            # in another terminal
API_URL=http://localhost:4000 npm run test:acceptance
```

## Before launch (business inputs needed)

- Upload the real hero video and fallback still; replace sample products and photos.
- Enter real bank details and WhatsApp number (**Site settings → Store**).
- Confirm 925 purity per product before ticking the tag; confirm the gemstone-testing provider and wording.
- Review the policy texts with a legal adviser (consumer-protection rights must not be limited).
- Production hosting: HTTPS, a strong `JWT_SECRET`, `CORS_ORIGIN`, daily `pg_dump` backups and a backup of `backend/uploads/` (see `backend/README.md`).
