-- Add shop_item_id column to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shop_item_id uuid REFERENCES public.shop_items(id);

-- Drop the existing check constraint
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_or_spare_part_check;

-- Add new check constraint that allows product_id, spare_part_id, OR shop_item_id
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_or_spare_part_or_shop_item_check 
CHECK (
  (product_id IS NOT NULL AND spare_part_id IS NULL AND shop_item_id IS NULL) OR
  (product_id IS NULL AND spare_part_id IS NOT NULL AND shop_item_id IS NULL) OR
  (product_id IS NULL AND spare_part_id IS NULL AND shop_item_id IS NOT NULL)
);