-- SULTANÉ database schema
-- Run via `npm run migrate`

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Admin users (owner / staff / viewer — role is informational only
-- until granular permissions are required)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Catalogue
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tagline     TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              TEXT NOT NULL UNIQUE,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  collection_slug  TEXT NOT NULL REFERENCES collections(slug),
  category         TEXT NOT NULL CHECK (category IN ('Rings','Earrings','Pendants','Bracelets','Chains','Necklaces')),
  price_pkr        INTEGER NOT NULL CHECK (price_pkr >= 0),
  description      TEXT NOT NULL DEFAULT '',
  sizes            TEXT[],
  availability     TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available','enquire')),
  production_days  TEXT NOT NULL DEFAULT '5–7 working days',
  is_bestseller    BOOLEAN NOT NULL DEFAULT false,
  is_premium       BOOLEAN NOT NULL DEFAULT false,
  has_gemstone     BOOLEAN NOT NULL DEFAULT false,
  purity_925       BOOLEAN NOT NULL DEFAULT false,
  published        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- Orders (made-to-order, manual payment verification)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref              TEXT NOT NULL UNIQUE,            -- e.g. SLT-2026-000123
  customer_name    TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  street           TEXT NOT NULL,
  area             TEXT,
  city             TEXT NOT NULL,
  province         TEXT NOT NULL,
  postal_code      TEXT,
  delivery_notes   TEXT,
  subtotal_pkr     INTEGER NOT NULL,
  testing_fees_pkr INTEGER NOT NULL DEFAULT 0,
  delivery_pkr     INTEGER NOT NULL DEFAULT 0,
  discount_pkr     INTEGER NOT NULL DEFAULT 0,
  total_pkr        INTEGER NOT NULL,
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('cod','bank-transfer')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending-review','verified')),
  order_status     TEXT NOT NULL DEFAULT 'pending-confirmation'
                   CHECK (order_status IN ('pending-confirmation','awaiting-payment','preparing','quality-check','ready-for-dispatch','dispatched','delivered')),
  promo_code       TEXT,
  payment_proof_url TEXT,
  courier_name     TEXT,
  tracking_number  TEXT,
  tracking_url     TEXT,
  dispatched_at    TIMESTAMPTZ,
  verified_at      TIMESTAMPTZ,
  verified_by      UUID REFERENCES admin_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id),
  product_name      TEXT NOT NULL,     -- snapshot at time of order
  collection_slug   TEXT NOT NULL,
  category          TEXT NOT NULL,
  size              TEXT,
  qty               INTEGER NOT NULL CHECK (qty > 0),
  unit_price_pkr    INTEGER NOT NULL,
  gemstone_testing  BOOLEAN NOT NULL DEFAULT false
);

-- ─────────────────────────────────────────────────────────────
-- Article registry — one unique code per physical piece,
-- generated ONLY after payment is verified
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,  -- SLT-XXXX-XXXX-XXXX
  order_id            UUID NOT NULL REFERENCES orders(id),
  order_item_id       UUID NOT NULL REFERENCES order_items(id),
  product_name        TEXT NOT NULL,
  collection_slug     TEXT NOT NULL,
  sku                 TEXT NOT NULL,
  variant             TEXT,
  material_note       TEXT,
  recorded_weight     TEXT,
  customer_name       TEXT NOT NULL,     -- display-only, no contact details ever exposed publicly
  purchase_date       DATE NOT NULL,
  verification_count  INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: order_item_id is NOT unique here — when an order line has qty > 1,
-- one article code is generated per physical piece (one row per unit),
-- never one code shared across multiple pieces.
CREATE INDEX IF NOT EXISTS idx_article_codes_order_item ON article_codes(order_item_id);

-- ─────────────────────────────────────────────────────────────
-- Customisation enquiries (both "modify existing design" and
-- "entirely new design" share one table, distinguished by `type`)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                TEXT NOT NULL UNIQUE,   -- e.g. SLT-ENQ-20261020-A7K2
  type               TEXT NOT NULL CHECK (type IN ('customize','new-design')),
  status             TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','accepted','declined')),
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  email              TEXT,
  product_id         UUID REFERENCES products(id),  -- set when type = 'customize'
  product_name       TEXT,
  product_sku        TEXT,
  jewellery_type     TEXT,                          -- set when type = 'new-design'
  purity_preference  TEXT,
  budget_range       TEXT,
  size_notes         TEXT,
  instructions       TEXT,
  quoted_price_pkr   INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiry_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id  UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,   -- private, staff-only; never served on public routes
  filename    TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- Promotions / loyalty
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  code            TEXT PRIMARY KEY,
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value  INTEGER NOT NULL,
  max_redemptions INTEGER,            -- NULL = unlimited
  redemption_count INTEGER NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT true
);

-- Tracks the one-time 5% reward issued after a customer's first completed order
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  code          TEXT NOT NULL REFERENCES promo_codes(code),
  issued_for_order UUID REFERENCES orders(id),
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at   TIMESTAMPTZ,
  UNIQUE (customer_phone)             -- prevents issuing the reward twice for the same customer
);

-- ─────────────────────────────────────────────────────────────
-- Site settings (delivery fees, WhatsApp number, policy text)
-- stored as key/value so the owner can edit without a migration
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
