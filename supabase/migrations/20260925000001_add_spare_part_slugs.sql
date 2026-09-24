-- Add SEO-friendly slug column to spare_parts (mirrors 20260308000001_add_product_slugs.sql)
-- Slug format: kebab-case-name + first 8 chars of UUID (ensures global uniqueness)
-- Example: "Infinix Smart 8 Plus LCD Panel" → "infinix-smart-8-plus-lcd-panel-226d1b5a"
-- Additive and idempotent: safe to re-run; never touches existing ids.

ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE spare_parts
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_spare_parts_slug ON spare_parts(slug);

-- Auto-generate slug on INSERT if not provided
CREATE OR REPLACE FUNCTION generate_spare_part_slug()
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

DROP TRIGGER IF EXISTS trg_spare_part_slug ON spare_parts;
CREATE TRIGGER trg_spare_part_slug
  BEFORE INSERT ON spare_parts
  FOR EACH ROW EXECUTE FUNCTION generate_spare_part_slug();
