-- Catalog classification layer (ADDITIVE — existing tables, URLs and categories are untouched).
-- catalog_items: one row per sellable item (products + spare_parts + shop_items), classified by
--   brand / series / model / part type / price range, pointing at the item's EXISTING live URL.
--   An item appears in every category it matches; duplicates across source tables are kept.
-- catalog_categories: one row per category page (/brands/…, /parts/…, /phones/price/…).
-- Both tables are rebuilt from the source tables by server/catalog/rebuild.js.

CREATE TABLE IF NOT EXISTS catalog_items (
  item_id          UUID        NOT NULL,
  source_table     TEXT        NOT NULL,          -- products | spare_parts | shop_items
  name             TEXT        NOT NULL,          -- original name, unchanged
  kind             TEXT        NOT NULL,          -- Phone | Tablet | Mobile Spare Part | Laptop Part | Accessory | …
  brand            TEXT        NOT NULL,
  brand_slug       TEXT        NOT NULL,
  series           TEXT,
  series_slug      TEXT,
  model            TEXT,
  model_slug       TEXT,
  part_group       TEXT,
  part_type        TEXT,
  part_type_slug   TEXT,
  quality          TEXT,
  display_tech     TEXT,
  pta_status       TEXT,
  condition        TEXT,
  price            NUMERIC,
  regular_price    NUMERIC,
  price_band       TEXT,
  price_band_slug  TEXT,
  stock            INTEGER,
  in_stock         BOOLEAN,
  url_path         TEXT        NOT NULL,          -- live URL, e.g. /product/huawei-honor-5c-original-battery-f68de3fa
  old_url_path     TEXT,                          -- legacy UUID URL (still works, 301s to url_path)
  main_image       TEXT,
  images           TEXT[],
  image_count      INTEGER,
  bucket_folder    TEXT,
  needs_review     TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (source_table, item_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_brand        ON catalog_items (brand_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_brand_model  ON catalog_items (brand_slug, model_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_part         ON catalog_items (part_type_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_part_brand   ON catalog_items (part_type_slug, brand_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_kind_price   ON catalog_items (kind, price_band_slug);

CREATE TABLE IF NOT EXISTS catalog_categories (
  path             TEXT        PRIMARY KEY,       -- e.g. /parts/batteries/samsung
  type             TEXT        NOT NULL,          -- brand_index | brand | model | part_index | part | part_brand | phones_price
  title            TEXT        NOT NULL,          -- <title>
  heading          TEXT        NOT NULL,          -- visible <h1>
  description      TEXT        NOT NULL,          -- meta description
  brand            TEXT,
  brand_slug       TEXT,
  series           TEXT,
  model            TEXT,
  model_slug       TEXT,
  part_group       TEXT,
  part_type        TEXT,
  part_type_slug   TEXT,
  price_band       TEXT,
  price_band_slug  TEXT,
  parent_path      TEXT,
  item_count       INTEGER     NOT NULL DEFAULT 0,   -- every listing (duplicates across tables included)
  unique_count     INTEGER     NOT NULL DEFAULT 0,   -- distinct product names
  min_price        NUMERIC,
  max_price        NUMERIC,
  indexable        BOOLEAN     NOT NULL DEFAULT false,   -- only pages with 2+ items go in the sitemap
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_categories_type   ON catalog_categories (type);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_parent ON catalog_categories (parent_path);
