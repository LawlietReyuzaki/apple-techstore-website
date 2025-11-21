-- Create storage bucket for spare parts images
insert into storage.buckets (id, name, public)
values ('spare-parts-images', 'spare-parts-images', true);

-- Create RLS policies for spare parts images bucket
CREATE POLICY "Anyone can view spare parts images"
ON storage.objects FOR SELECT
USING (bucket_id = 'spare-parts-images');

CREATE POLICY "Admins can upload spare parts images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'spare-parts-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update spare parts images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'spare-parts-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete spare parts images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'spare-parts-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);