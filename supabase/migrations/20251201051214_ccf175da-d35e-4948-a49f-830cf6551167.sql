-- Fix repairs table RLS policy to prevent public access to customer PII
-- Remove the (auth.uid() IS NULL) condition that allows unauthenticated access

DROP POLICY IF EXISTS "Users can view own repairs" ON public.repairs;

CREATE POLICY "Users can view own repairs"
ON public.repairs
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR (assigned_to IN (
    SELECT technicians.id
    FROM technicians
    WHERE technicians.user_id = auth.uid()
  ))
);