-- Add INSERT policy for admin_settings (needed for edge function)
CREATE POLICY "Service role can insert admin settings"
ON public.admin_settings
FOR INSERT
WITH CHECK (true);

-- Add DELETE policy for admin (to clear old entries when changing email)
CREATE POLICY "Service role can delete admin settings"
ON public.admin_settings
FOR DELETE
USING (true);