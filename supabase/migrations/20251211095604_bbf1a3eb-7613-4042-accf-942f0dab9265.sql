-- Drop the existing check constraint and add a new one that includes 'shop_item'
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_item_type_check;

ALTER TABLE public.order_items ADD CONSTRAINT order_items_item_type_check 
CHECK (item_type IN ('product', 'spare_part', 'shop_item'));