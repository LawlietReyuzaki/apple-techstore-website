-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Allow all repairs inserts" ON public.repairs;

-- Create INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create repairs" 
ON public.repairs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create INSERT policy for anonymous users
CREATE POLICY "Anonymous users can create repairs" 
ON public.repairs 
FOR INSERT 
TO anon
WITH CHECK (true);