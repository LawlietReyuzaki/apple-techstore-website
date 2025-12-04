-- Drop the old restrictive policy and create a public read policy for payment settings
-- This is needed for guest checkout to work properly
DROP POLICY IF EXISTS "Authenticated users can view payment settings" ON public.payment_settings;

CREATE POLICY "Anyone can view payment settings" 
ON public.payment_settings 
FOR SELECT 
USING (true);