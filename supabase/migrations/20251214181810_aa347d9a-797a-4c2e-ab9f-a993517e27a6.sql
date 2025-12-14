-- Fix RLS so guest (anon) users can insert into orders
-- 1) Drop existing restrictive admin ALL policy
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;

-- 2) Recreate admin policy as PERMISSIVE so it doesn't block other insert policies
CREATE POLICY "Admins have full access to orders"
ON public.orders
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- NOTE: Existing policy "Anyone can create orders" (FOR INSERT TO public WITH CHECK (true))
-- now works for guests because there are no restrictive INSERT policies anymore.
