-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

-- Create a PERMISSIVE INSERT policy that allows both authenticated users and guests
CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));