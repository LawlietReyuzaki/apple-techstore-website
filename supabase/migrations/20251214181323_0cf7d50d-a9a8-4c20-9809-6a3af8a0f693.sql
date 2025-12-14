-- Relax INSERT policy on order_items to fully support guest checkout
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items" 
ON public.order_items
FOR INSERT
TO public
WITH CHECK (true);
