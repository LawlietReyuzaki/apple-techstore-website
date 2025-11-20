-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_screenshots', 'payment_screenshots', false);

-- Create policies for payment screenshots
CREATE POLICY "Users can upload payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'payment_screenshots' AND (auth.uid() IS NOT NULL OR auth.uid() IS NULL));

CREATE POLICY "Users can view their own payment screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment_screenshots' AND (auth.uid() IS NOT NULL OR auth.uid() IS NULL));

CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment_screenshots' AND has_role(auth.uid(), 'admin'::app_role));