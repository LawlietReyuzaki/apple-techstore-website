-- Add enable/disable toggles for payment methods
ALTER TABLE public.payment_settings 
ADD COLUMN IF NOT EXISTS enable_easypaisa boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_jazzcash boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_bank_transfer boolean DEFAULT true;