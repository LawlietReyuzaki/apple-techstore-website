-- Add has_color_options column to spare_parts table
ALTER TABLE public.spare_parts 
ADD COLUMN has_color_options boolean DEFAULT false;