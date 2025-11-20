-- Drop the existing limited admin policy on payments
DROP POLICY IF EXISTS "Admins can update payments" ON payments;

-- Create comprehensive admin policy for payments
CREATE POLICY "Admins have full access to payments"
ON payments
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Drop and recreate the orders policies to ensure admins can see all orders in joins
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

CREATE POLICY "Users can view own orders or admins can view all"
ON orders
FOR SELECT
USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins have full access to orders"
ON orders
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
);