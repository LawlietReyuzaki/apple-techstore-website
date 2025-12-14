-- Relax INSERT policy on orders to fully support guest checkout
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders" 
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);
