-- Create admin_settings table to store single admin email
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL UNIQUE,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read admin email (needed for notifications routing)
CREATE POLICY "Anyone can read admin settings"
ON public.admin_settings
FOR SELECT
USING (true);

-- Only admins can update admin settings
CREATE POLICY "Admins can update admin settings"
ON public.admin_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial admin record with current admin email
INSERT INTO public.admin_settings (admin_email, admin_user_id)
SELECT 'appletwch2228@gmail.com', u.id
FROM auth.users u
WHERE u.email = 'appletwch2228@gmail.com'
LIMIT 1
ON CONFLICT (admin_email) DO NOTHING;

-- Create function to update admin_settings updated_at
CREATE OR REPLACE FUNCTION public.update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_settings_timestamp
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_settings_updated_at();