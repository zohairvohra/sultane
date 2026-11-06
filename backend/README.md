# SULTANÉ API

Express 5 + PostgreSQL. Schema and seed data live in `../database`.

## Setup

```bash
npm install
cp .env.example .env     # DATABASE_URL, JWT_SECRET (24+ random characters), CORS_ORIGIN
npm run migrate          # → ../database
npm run seed             # → ../database
npm run dev              # http://localhost:4000
```

`npm run reset-db` drops and recreates the schema (deletes all data). `npm run test:acceptance` runs the 71 acceptance checks against a running API on a freshly seeded DB (`API_URL` defaults to `http://localhost:4000`).

## Design rules enforced on the server

- **Prices are never trusted from the client.** `POST /api/orders/quote` and `POST /api/orders` re-price every line from the database, add the gemstone-testing fee only for eligible Premium pieces, compute delivery from the city (Karachi vs elsewhere, from settings) and evaluate promo codes. The promo row is locked inside the order transaction so limits cannot be over-redeemed.
- **Payment and production are separate.** `payment_status`: `awaiting → proof-submitted → verified` (or `flagged`). Uploading a receipt changes only `payment_status`. The only way into `payment-verified` is `POST /api/orders/:id/verify-payment`, and production stages refuse orders without a verified payment.
- **Article numbers** (`SLT-XXXX-XXXX-XXXX`, unambiguous alphabet, ~7.9×10¹⁷ combinations) are created in the verification transaction, one row per physical piece, with `UNIQUE(code)` and `UNIQUE(order_item_id, piece_index)`. `GET /api/articles/verify/:code` returns only `customerName`, `productName`, `purchaseDate` (+ the code), is rate-limited per IP (10/min, 60/hour), and returns the same 404 for malformed, unknown and voided numbers.
- **Private files.** Payment receipts and customer reference images are stored in `uploads/private/` and served only through admin-authenticated routes. Product, collection and hero media live in `uploads/public/`, served at `/uploads/…`.
- **Order tracking** requires both the order number and the phone on the order.
- **Loyalty reward** is issued only for a delivered order and at most once per phone (`UNIQUE(customer_phone)`); the generated code is single-use, bound to that phone and expires after the configured number of days.
- **Roles.** `owner` can do everything; `staff` can run orders/products/enquiries but not settings, promotions, registry corrections or deletions; `viewer` is read-only.

## Routes (summary)

| Area | Public | Admin |
|---|---|---|
| Auth | `POST /auth/customer/register`, `/customer/login`, `GET /customer/me` | `POST /auth/login`, `/change-password` |
| Catalogue | `GET /products`, `/products/gemstones`, `/products/:slug`, `GET /collections` | product CRUD, image upload/reorder/delete, collection CRUD + image |
| Orders | `POST /orders/quote`, `POST /orders`, `POST /orders/lookup`, `POST /orders/:ref/payment-proof`, `GET /orders/mine[/:ref]` | list/search, detail, receipt file, verify/flag payment, status, courier, notes, pending-price edit, loyalty issue/sent |
| Enquiries | `POST /enquiries` | list, detail, reference files, update, convert to order |
| Registry | `GET /articles/verify/:code` | list/search, correct record (owner) |
| Promotions | — (evaluated via quote) | CRUD, loyalty list, eligible customers |
| Settings | `GET /settings` | `PUT /settings/:key` (validated), hero media upload |
| Reports | — | `GET /reports/summary` |

## Operations

- **Backups:** schedule `pg_dump --format=custom $DATABASE_URL > sultane-$(date +%F).dump` daily and copy `uploads/` with it; restore with `pg_restore --clean -d $DATABASE_URL file.dump`.
- **Rate limiting** is in-memory (single instance). Use a shared store if running more than one instance.
- **Uploads** are on local disk. On hosts with ephemeral disks, mount a persistent volume at `backend/uploads` or move to object storage.
