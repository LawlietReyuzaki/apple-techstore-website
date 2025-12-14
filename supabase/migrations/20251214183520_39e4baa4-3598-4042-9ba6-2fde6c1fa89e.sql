-- ============================================
-- Fix Guest Checkout RLS Policies
-- ============================================

-- Step 1: Drop problematic RESTRICTIVE policy on order_items
DROP POLICY IF EXISTS "Admins can manage order items" ON order_items;

-- Step 2: Recreate as PERMISSIVE policy for admins
CREATE POLICY "Admins full access to order items"
ON order_items
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Step 3: Ensure anonymous INSERT policy exists and is explicit
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;

CREATE POLICY "Allow anonymous order item creation"
ON order_items
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated order item creation"
ON order_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 4: Verify SELECT policy allows viewing order items through orders
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

CREATE POLICY "Users can view related order items"
ON order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid()
      OR orders.user_id IS NULL
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- Step 5: Ensure orders table policies support guest checkout
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

CREATE POLICY "Allow anonymous order creation"
ON orders
FOR INSERT
TO anon
WITH CHECK (
  customer_email IS NOT NULL
  AND customer_phone IS NOT NULL
  AND customer_name IS NOT NULL
  AND delivery_address IS NOT NULL
);

CREATE POLICY "Allow authenticated order creation"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (true);