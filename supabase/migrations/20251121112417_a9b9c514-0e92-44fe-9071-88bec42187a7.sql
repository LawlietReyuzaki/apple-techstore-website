-- Add admin access policy for payment_screenshots bucket
-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can view payment screenshots" ON storage.objects;

-- Allow admins to view all payment screenshots
CREATE POLICY "Admins can view payment screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment_screenshots' 
  AND has_role(auth.uid(), 'admin'::app_role)
);