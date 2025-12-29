-- Add variant control flags to products table
ALTER TABLE public.products 
ADD COLUMN has_color_options boolean DEFAULT false,
ADD COLUMN has_part_type_options boolean DEFAULT false;

-- Create product_part_types table for product-specific part types
CREATE TABLE public.product_part_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  part_type_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_part_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_part_types
CREATE POLICY "Admins can manage product part types"
ON public.product_part_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view product part types"
ON public.product_part_types
FOR SELECT
USING (true);

-- Add variant columns to order_items for tracking selections
ALTER TABLE public.order_items
ADD COLUMN selected_color text,
ADD COLUMN selected_part_type text;