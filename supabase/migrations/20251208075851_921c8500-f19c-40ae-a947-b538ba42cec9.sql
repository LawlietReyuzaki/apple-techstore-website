-- Add accessory_subcategory column to products table for accessories subcategory support
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS accessory_subcategory text DEFAULT NULL;

-- Add a check constraint for valid subcategory values
ALTER TABLE public.products 
ADD CONSTRAINT valid_accessory_subcategory 
CHECK (accessory_subcategory IS NULL OR accessory_subcategory IN ('mobile', 'laptop', 'pc', 'computer'));

-- Insert the new categories if they don't exist
INSERT INTO public.categories (name, description) 
SELECT 'Used Phones', 'Pre-owned mobile phones in excellent condition'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Used Phones');

INSERT INTO public.categories (name, description) 
SELECT 'Laptops', 'New and refurbished laptops'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Laptops');

INSERT INTO public.categories (name, description) 
SELECT 'Accessories', 'Mobile, laptop, PC and computer accessories'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Accessories');