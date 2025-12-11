-- Drop the existing INSERT policy for repairs
DROP POLICY IF EXISTS "Users can create repairs" ON public.repairs;

-- Create a simpler, more robust INSERT policy
CREATE POLICY "Users can create repairs" 
ON public.repairs 
FOR INSERT 
WITH CHECK (
  (user_id IS NULL) OR 
  (user_id = auth.uid())
);