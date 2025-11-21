-- Add enable_cod field to payment_settings table
ALTER TABLE public.payment_settings 
ADD COLUMN enable_cod boolean DEFAULT true;