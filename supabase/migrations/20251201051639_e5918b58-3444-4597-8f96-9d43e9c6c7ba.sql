-- Fix payment_settings table RLS policy to prevent public access
-- Authenticated users can view payment details (needed for checkout)
-- Only admins can modify payment settings

DROP POLICY IF EXISTS "Anyone can view payment settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Admins can manage payment settings" ON public.payment_settings;

CREATE POLICY "Authenticated users can view payment settings"
ON public.payment_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));