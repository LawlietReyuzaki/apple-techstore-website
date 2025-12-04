-- Drop the restrictive policy and create a permissive one for guest checkout
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

-- Create a PERMISSIVE policy that allows both authenticated users and guests
CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
TO public
WITH CHECK (
  (auth.uid() = user_id) OR (user_id IS NULL)
);

-- Also fix the order_items insert policy to be permissive
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

CREATE POLICY "Users can create order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  order_id IN (
    SELECT id FROM orders 
    WHERE (orders.user_id = auth.uid()) OR (orders.user_id IS NULL)
  )
);