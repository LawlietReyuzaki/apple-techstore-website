-- Create payment methods enum
CREATE TYPE payment_method AS ENUM ('easypaisa', 'jazzcash', 'bank_transfer');

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'declined', 'refunded');

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  transaction_id TEXT NOT NULL,
  sender_number TEXT NOT NULL,
  payment_screenshot_url TEXT,
  amount NUMERIC NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  decline_reason TEXT,
  refund_wallet_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id)
);

-- Create payment settings table for admin configuration
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  easypaisa_number TEXT,
  easypaisa_qr_code_url TEXT,
  jazzcash_number TEXT,
  jazzcash_qr_code_url TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  delivery_charges NUMERIC DEFAULT 0,
  wallet_transfer_charges NUMERIC DEFAULT 0,
  service_fees NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default payment settings row
INSERT INTO public.payment_settings (id) VALUES (gen_random_uuid());

-- Add payment_id to orders table
ALTER TABLE public.orders ADD COLUMN payment_id UUID REFERENCES public.payments(id);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Admins can update payments"
ON public.payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment settings policies
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payment settings"
ON public.payment_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update payments updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_timestamp
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at();

-- Create trigger to update payment_settings updated_at
CREATE TRIGGER update_payment_settings_timestamp
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at();