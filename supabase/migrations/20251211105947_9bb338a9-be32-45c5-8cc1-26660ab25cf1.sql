-- Temporarily disable RLS on repairs
ALTER TABLE public.repairs DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Anyone can create repairs" ON public.repairs;
DROP POLICY IF EXISTS "Users can create repairs" ON public.repairs;

-- Create a new INSERT policy that allows all inserts
CREATE POLICY "Allow all repairs inserts" 
ON public.repairs 
FOR INSERT 
TO public
WITH CHECK (true);