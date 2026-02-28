-- ============================================================
-- Update all local image paths → Google Cloud Storage URLs
-- GCS bucket: gs://dilbar-product-images
-- Run AFTER images have been uploaded to GCS
-- ============================================================

-- 1. products.images  (TEXT[] — 11,933 rows)
--    "images/foo/bar.jpg"  →  "https://storage.googleapis.com/dilbar-product-images/images/foo/bar.jpg"
UPDATE products
SET images = (
  SELECT array_agg(
    CASE
      WHEN elem LIKE 'http%' THEN elem   -- already a full URL, leave it
      ELSE 'https://storage.googleapis.com/dilbar-product-images/' || elem
    END
  )
  FROM unnest(images) AS elem
)
WHERE images IS NOT NULL
  AND array_length(images, 1) > 0
  AND images[1] NOT LIKE 'http%';

-- 2. shop_items.images  (TEXT[])
UPDATE shop_items
SET images = (
  SELECT array_agg(
    CASE
      WHEN elem LIKE 'http%' THEN elem
      ELSE 'https://storage.googleapis.com/dilbar-product-images/' || elem
    END
  )
  FROM unnest(images) AS elem
)
WHERE images IS NOT NULL
  AND array_length(images, 1) > 0
  AND images[1] NOT LIKE 'http%';

-- 3. spare_parts.images  (TEXT[])
UPDATE spare_parts
SET images = (
  SELECT array_agg(
    CASE
      WHEN elem LIKE 'http%' THEN elem
      ELSE 'https://storage.googleapis.com/dilbar-product-images/' || elem
    END
  )
  FROM unnest(images) AS elem
)
WHERE images IS NOT NULL
  AND array_length(images, 1) > 0
  AND images[1] NOT LIKE 'http%';

-- 4. shop_categories.image_url  (TEXT — single value)
UPDATE shop_categories
SET image_url = 'https://storage.googleapis.com/dilbar-product-images/' || image_url
WHERE image_url IS NOT NULL
  AND image_url NOT LIKE 'http%'
  AND image_url != '';

-- ── Verify counts ─────────────────────────────────────────────
SELECT 'products' AS tbl, count(*) AS rows_updated
FROM products WHERE images[1] LIKE 'https://storage.googleapis.com%'
UNION ALL
SELECT 'shop_items', count(*)
FROM shop_items WHERE images[1] LIKE 'https://storage.googleapis.com%'
UNION ALL
SELECT 'spare_parts', count(*)
FROM spare_parts WHERE images[1] LIKE 'https://storage.googleapis.com%'
UNION ALL
SELECT 'shop_categories', count(*)
FROM shop_categories WHERE image_url LIKE 'https://storage.googleapis.com%';
