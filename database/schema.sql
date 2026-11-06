-- SULTANÉ database schema (v2 — aligned with Feasibility Study v2)
-- Run via `npm run migrate`. For a clean rebuild: `npm run reset && npm run seed`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Admin users
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
-- Optional customer accounts (guest checkout remains available)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,      -- normalised, e.g. 923001234567
  email         TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Catalogue
-- Cultural collections (Italia, Turkish, Middle Eastern). A product can
-- belong to several collections, and separately be flagged Bestseller,
-- Premium or Men's — so one necklace can appear under Necklaces, Italia
-- and Bestsellers at the same time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tagline     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 TEXT NOT NULL UNIQUE,                 -- unique internal product identifier
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN ('Necklaces','Earrings','Bracelets','Rings','Chains','Pendants')),
  price_pkr           INTEGER NOT NULL CHECK (price_pkr >= 0),
  description         TEXT NOT NULL DEFAULT '',
  sizes               TEXT[],
  -- Made-to-order availability (no quantity-based stock):
  --   active = purchasable, paused = visible but sales temporarily paused, draft = unpublished
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','draft')),
  production_time     TEXT NOT NULL DEFAULT '7–10 working days',
  is_bestseller       BOOLEAN NOT NULL DEFAULT false,
  is_premium          BOOLEAN NOT NULL DEFAULT false,
  is_mens             BOOLEAN NOT NULL DEFAULT false,
  allow_customisation BOOLEAN NOT NULL DEFAULT true,
  -- Material claims are opt-in per product, never automatic
  purity_925          BOOLEAN NOT NULL DEFAULT false,
  material_note       TEXT,
  -- Gemstone details
  gemstone_type       TEXT,                                  -- NULL = no gemstone
  gemstone_origin     TEXT CHECK (gemstone_origin IN ('natural','lab-created')),
  gemstone_details    TEXT,
  testing_available   BOOLEAN NOT NULL DEFAULT false,       -- Premium only; Rs. 799 add-on
  certification_info  TEXT,
  position            INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_collections (
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_slug TEXT NOT NULL REFERENCES collections(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (product_id, collection_slug)
);

CREATE TABLE IF NOT EXISTS product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- Orders (made-to-order, bank transfer only, manual verification)
--
-- payment_status:  awaiting → proof-submitted → verified
--                                         ↘ flagged (needs review)
-- order_status:    pending-price → awaiting-payment → payment-verified →
--                  in-production → quality-check → ready-for-dispatch →
--                  dispatched → delivered       (+ cancelled)
-- Uploading proof NEVER changes order_status; only an admin verification does.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                TEXT NOT NULL UNIQUE,                  -- SLT-2026-123456
  customer_id        UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name      TEXT NOT NULL,
  phone              TEXT NOT NULL,                         -- normalised
  email              TEXT,
  street             TEXT NOT NULL,
  area               TEXT,
  city               TEXT NOT NULL,
  province           TEXT,
  delivery_notes     TEXT,
  subtotal_pkr       INTEGER NOT NULL,
  testing_fees_pkr   INTEGER NOT NULL DEFAULT 0,
  delivery_pkr       INTEGER NOT NULL DEFAULT 0,
  discount_pkr       INTEGER NOT NULL DEFAULT 0,
  total_pkr          INTEGER NOT NULL,
  payment_method     TEXT NOT NULL DEFAULT 'bank-transfer' CHECK (payment_method IN ('bank-transfer')),
  payment_status     TEXT NOT NULL DEFAULT 'awaiting'
                     CHECK (payment_status IN ('awaiting','proof-submitted','verified','flagged')),
  payment_note       TEXT,
  payment_proof_path TEXT,                                  -- private file, admin-only
  proof_uploaded_at  TIMESTAMPTZ,
  order_status       TEXT NOT NULL DEFAULT 'awaiting-payment'
                     CHECK (order_status IN ('pending-price','awaiting-payment','payment-verified','in-production',
                                             'quality-check','ready-for-dispatch','dispatched','delivered','cancelled')),
  promo_code         TEXT,
  courier_name       TEXT,
  tracking_number    TEXT,
  tracking_url       TEXT,
  dispatch_date      DATE,
  delivered_at       TIMESTAMPTZ,
  verified_at        TIMESTAMPTZ,
  verified_by        UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_notes        TEXT,
  enquiry_id         UUID,                                  -- set when created from an approved custom quote
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  sku               TEXT,
  product_name      TEXT NOT NULL,          -- snapshot at time of order
  category          TEXT,
  size              TEXT,
  qty               INTEGER NOT NULL CHECK (qty > 0),
  unit_price_pkr    INTEGER NOT NULL,
  gemstone_testing  BOOLEAN NOT NULL DEFAULT false,  -- customer's choice, preserved
  testing_fee_pkr   INTEGER NOT NULL DEFAULT 0,      -- per piece, snapshot
  is_custom         BOOLEAN NOT NULL DEFAULT false,
  custom_details    TEXT
);

-- ─────────────────────────────────────────────────────────────
-- Article registry — one unique number per physical piece,
-- generated ONLY when payment is manually verified.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,      -- SLT-XXXX-XXXX-XXXX
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id       UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  piece_index         INTEGER NOT NULL,          -- 1..qty for that order line
  product_name        TEXT NOT NULL,             -- shown publicly
  customer_name       TEXT NOT NULL,             -- shown publicly (name only, never contact details)
  purchase_date       DATE NOT NULL,             -- shown publicly
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  notes               TEXT,                      -- internal only
  verification_count  INTEGER NOT NULL DEFAULT 0,
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_item_id, piece_index)            -- one number per piece, never duplicated
);

-- ─────────────────────────────────────────────────────────────
-- Customisation enquiries
--   customize  = modify an existing design (quote via WhatsApp)
--   new-design = entirely new piece from an inspiration image
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                TEXT NOT NULL UNIQUE,
  type               TEXT NOT NULL CHECK (type IN ('customize','new-design')),
  status             TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','converted','declined')),
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  product_id         UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name       TEXT,
  product_sku        TEXT,
  jewellery_type     TEXT,
  description        TEXT NOT NULL,
  preferences        TEXT,
  quoted_price_pkr   INTEGER,
  admin_notes        TEXT,
  order_id           UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiry_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id  UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,     -- private, admin-only
  filename    TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- Promotions & loyalty
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  code               TEXT PRIMARY KEY,
  description        TEXT,
  kind               TEXT NOT NULL DEFAULT 'campaign' CHECK (kind IN ('campaign','loyalty')),
  discount_type      TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value     INTEGER NOT NULL CHECK (discount_value > 0),
  min_order_pkr      INTEGER NOT NULL DEFAULT 0,
  max_redemptions    INTEGER,                 -- NULL = unlimited
  per_phone_limit    INTEGER,                 -- NULL = unlimited
  redemption_count   INTEGER NOT NULL DEFAULT 0,
  starts_at          TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  active             BOOLEAN NOT NULL DEFAULT true,
  collection_slugs   TEXT[],                  -- NULL/empty = all
  product_ids        UUID[],                  -- NULL/empty = all
  restricted_phone   TEXT,                    -- loyalty codes are bound to one customer
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL REFERENCES promo_codes(code) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  amount_pkr  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The 5% next-order reward. Trigger: the customer's FIRST order that
-- reaches "delivered". UNIQUE(customer_phone) means it can never be
-- issued twice for the same customer.
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone   TEXT NOT NULL UNIQUE,
  customer_name    TEXT NOT NULL,
  code             TEXT NOT NULL REFERENCES promo_codes(code) ON DELETE CASCADE,
  issued_for_order UUID REFERENCES orders(id) ON DELETE SET NULL,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at          TIMESTAMPTZ,              -- owner marks when sent on WhatsApp
  redeemed_at      TIMESTAMPTZ,
  redeemed_order   UUID REFERENCES orders(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- Site settings (delivery fees, WhatsApp, bank details, policies, FAQs,
-- hero video) — key/value so the owner edits them without a migration.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_collections_slug ON product_collections(collection_slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_article_codes_order ON article_codes(order_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_phone ON promo_redemptions(code, phone);
