-- Add on_sale and sale_price fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS on_sale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sale_price numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.products.on_sale IS 'Indicates if product is currently on sale';
COMMENT ON COLUMN public.products.sale_price IS 'Discounted price when product is on sale';