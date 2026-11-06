# SULTANÉ database

Owns the PostgreSQL schema for SULTANÉ: table definitions, one-time migration, and seed data. This is a standalone package — it doesn't depend on `../backend` or `../frontend`, so it can run in CI or on a fresh machine with nothing else installed.

## Setup

```bash
npm install
cp .env.example .env     # DATABASE_URL must point at an existing database
npm run migrate          # applies schema.sql — safe to re-run, every statement is idempotent
npm run seed              # collections, 24 sample products, default settings, one owner admin account
```

`npm run seed` prints the admin login it created. Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before seeding anything beyond local development.

## Files

```
schema.sql    All tables: admin_users, collections, products, product_images,
              orders, order_items, article_codes, enquiries, enquiry_files,
              promo_codes, loyalty_rewards, settings.
migrate.ts    Reads schema.sql and executes it against DATABASE_URL.
seed.ts       Idempotent sample data (ON CONFLICT DO UPDATE/NOTHING throughout).
pool.ts       Minimal pg.Pool used only by migrate.ts/seed.ts — the running API
              server has its own copy in ../backend/src/db/pool.ts, since that
              one lives in the request path and this one doesn't.
```

## Why this is a separate package

`../backend` needs a database client at request time (`src/db/pool.ts`) but has
no business owning the schema itself — schema changes are a deployment-time
concern (run once, before the API starts), not an application-runtime concern.
Keeping them apart means:

- CI can run `npm --prefix database run migrate` against a fresh database
  without installing or building the whole Express app.
- The schema has one obvious home instead of being buried inside an API
  package's internals.
- A future second consumer of this database (a worker, a CLI admin tool)
  doesn't have to depend on the Express app to get migrations.

## Key design decisions encoded in schema.sql

- **Article codes are per physical piece, not per order line.** `article_codes.order_item_id` is intentionally *not* unique — an order line with `qty = 2` gets two distinct codes when payment is verified, never one code covering both.
- **`loyalty_rewards.customer_phone` is unique**, so the 5%-next-order reward can't be issued twice to the same customer.
- **`orders.payment_status` and `orders.order_status` are separate columns** — a bank-transfer order can be `preparing` only after `payment_status = 'verified'`, enforced in `../backend/src/routes/orders.ts`, not in the database itself (kept here as a schema note since it shapes why both columns exist).
