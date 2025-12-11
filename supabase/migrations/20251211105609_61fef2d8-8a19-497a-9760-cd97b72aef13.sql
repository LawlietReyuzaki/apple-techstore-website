-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create repairs" ON public.repairs;

-- Create a more permissive INSERT policy - anyone can book repairs
CREATE POLICY "Anyone can create repairs" 
ON public.repairs 
FOR INSERT 
WITH CHECK (true);