-- Add a manual phone_model_name field to spare_parts table
ALTER TABLE public.spare_parts 
ADD COLUMN phone_model_name text;

-- Make phone_model_id nullable since we'll now support manual entry
ALTER TABLE public.spare_parts 
ALTER COLUMN phone_model_id DROP NOT NULL;