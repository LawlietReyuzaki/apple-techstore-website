-- Add image_url column to shop_categories for category images
ALTER TABLE public.shop_categories 
ADD COLUMN IF NOT EXISTS image_url text;

-- Comment for clarity
COMMENT ON COLUMN public.shop_categories.image_url IS 'URL for the category image displayed on homepage';