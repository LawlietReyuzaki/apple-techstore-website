-- Add links column to products table for storing related product links
ALTER TABLE public.products 
ADD COLUMN links text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.products.links IS 'Array of related links (official pages, reviews, specs)';