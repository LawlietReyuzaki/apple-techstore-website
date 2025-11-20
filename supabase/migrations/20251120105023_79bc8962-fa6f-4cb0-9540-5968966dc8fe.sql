-- Add missing fields to payment_settings table
ALTER TABLE public.payment_settings 
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS additional_instructions text;