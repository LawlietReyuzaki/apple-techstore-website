-- Make product_id nullable and add spare_part_id column to support both products and spare parts
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;

-- Add spare_part_id column
ALTER TABLE public.order_items ADD COLUMN spare_part_id uuid REFERENCES public.spare_parts(id) ON DELETE SET NULL;

-- Add check constraint to ensure at least one ID is present
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_or_spare_part_check 
CHECK (product_id IS NOT NULL OR spare_part_id IS NOT NULL);

-- Add item_type column to easily distinguish between products and spare parts
ALTER TABLE public.order_items ADD COLUMN item_type text DEFAULT 'product' CHECK (item_type IN ('product', 'spare_part'));