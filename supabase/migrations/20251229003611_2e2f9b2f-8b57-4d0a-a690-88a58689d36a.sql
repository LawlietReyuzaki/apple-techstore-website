-- Create product_colors table for storing color options for products
CREATE TABLE public.product_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage product colors"
ON public.product_colors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view product colors"
ON public.product_colors
FOR SELECT
USING (true);