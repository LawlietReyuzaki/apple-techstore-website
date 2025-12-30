-- Create spare_part_variants table for variant options with own price and stock
CREATE TABLE public.spare_part_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    spare_part_id uuid NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
    variant_name text NOT NULL,
    price numeric NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spare_part_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view spare part variants"
ON public.spare_part_variants
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage spare part variants"
ON public.spare_part_variants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster lookups
CREATE INDEX idx_spare_part_variants_spare_part_id ON public.spare_part_variants(spare_part_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_spare_part_variants_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_spare_part_variants_updated_at
BEFORE UPDATE ON public.spare_part_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_spare_part_variants_updated_at();