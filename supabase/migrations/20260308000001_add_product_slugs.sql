-- Add SEO-friendly slug column to products
-- Slug format: kebab-case-name + first 8 chars of UUID (ensures global uniqueness)
-- Example: "Xiaomi Poco X3 NFC LCD Panel" → "xiaomi-poco-x3-nfc-lcd-panel-550e8400"

ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for all existing products
UPDATE products
SET slug =
  TRIM('-' FROM
    REGEXP_REPLACE(
      LOWER(
        REGEXP_REPLACE(
          REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'),
          '[[:space:]]+', '-', 'g'
        )
      ),
      '-{2,}', '-', 'g'
    )
  ) || '-' || LEFT(id::text, 8)
WHERE slug IS NULL OR slug = '';

-- Ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Auto-generate slug on INSERT if not provided
CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug :=
      TRIM('-' FROM
        REGEXP_REPLACE(
          LOWER(
            REGEXP_REPLACE(
              REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'),
              '[[:space:]]+', '-', 'g'
            )
          ),
          '-{2,}', '-', 'g'
        )
      ) || '-' || LEFT(NEW.id::text, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_slug ON products;
CREATE TRIGGER trg_product_slug
  BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION generate_product_slug();
