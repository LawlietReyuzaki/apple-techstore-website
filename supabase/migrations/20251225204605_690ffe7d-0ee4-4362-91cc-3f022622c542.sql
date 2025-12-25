-- Create part_qualities table for admin-editable quality options
CREATE TABLE public.part_qualities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.part_qualities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage part qualities" 
ON public.part_qualities 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view part qualities" 
ON public.part_qualities 
FOR SELECT 
USING (true);

-- Add quality_id to spare_parts table
ALTER TABLE public.spare_parts 
ADD COLUMN quality_id uuid REFERENCES public.part_qualities(id);

-- Insert default quality options
INSERT INTO public.part_qualities (name, description, sort_order) VALUES
('Original', 'OEM original parts', 1),
('High Quality', 'Premium aftermarket parts', 2),
('Standard', 'Standard aftermarket parts', 3),
('Economy', 'Budget-friendly parts', 4);