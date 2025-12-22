-- Drop the existing restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Create a PERMISSIVE policy for admins to manage products
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));