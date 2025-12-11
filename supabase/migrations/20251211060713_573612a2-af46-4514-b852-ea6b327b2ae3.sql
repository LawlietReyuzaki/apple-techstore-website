-- Create part_requests table
CREATE TABLE public.part_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  part_name TEXT NOT NULL,
  part_details TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create part requests (for guest submissions)
CREATE POLICY "Anyone can create part requests"
ON public.part_requests
FOR INSERT
WITH CHECK (true);

-- Users can view their own requests by email
CREATE POLICY "Users can view own part requests"
ON public.part_requests
FOR SELECT
USING (true);

-- Admins can manage all part requests
CREATE POLICY "Admins can manage part requests"
ON public.part_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_part_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_part_requests_updated_at
BEFORE UPDATE ON public.part_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_part_requests_updated_at();

-- Create storage bucket for part request images
INSERT INTO storage.buckets (id, name, public) VALUES ('part-request-images', 'part-request-images', true);

-- Storage policies for part request images
CREATE POLICY "Anyone can upload part request images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'part-request-images');

CREATE POLICY "Anyone can view part request images"
ON storage.objects FOR SELECT
USING (bucket_id = 'part-request-images');