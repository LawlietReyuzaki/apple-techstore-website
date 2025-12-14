-- Drop the existing restrictive INSERT policy for orders
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

-- Create a PERMISSIVE INSERT policy that allows both authenticated users and guests
CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
TO public
WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

-- Drop the existing restrictive INSERT policy for order_items
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

-- Create a PERMISSIVE INSERT policy for order_items that allows guests
CREATE POLICY "Users can create order items" 
ON public.order_items 
FOR INSERT 
TO public
WITH CHECK (order_id IN (SELECT orders.id FROM orders WHERE orders.user_id = auth.uid() OR orders.user_id IS NULL));