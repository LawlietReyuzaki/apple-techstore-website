-- Add INSERT policy for public role (covers all API access)
CREATE POLICY "Public can create repairs" 
ON public.repairs 
FOR INSERT 
TO public
WITH CHECK (true);