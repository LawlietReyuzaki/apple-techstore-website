-- Create phone categories table (Android, iPhone)
CREATE TABLE public.phone_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create spare parts brands table
CREATE TABLE public.spare_parts_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_category_id UUID NOT NULL REFERENCES public.phone_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(phone_category_id, name)
);

-- Create phone models table
CREATE TABLE public.phone_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.spare_parts_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Create part categories table (LCD, Touch, Battery, etc.)
CREATE TABLE public.part_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create part types table (Amoled, IPS, etc.)
CREATE TABLE public.part_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.part_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create spare parts table
CREATE TABLE public.spare_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_model_id UUID NOT NULL REFERENCES public.phone_models(id) ON DELETE CASCADE,
  part_category_id UUID NOT NULL REFERENCES public.part_categories(id) ON DELETE CASCADE,
  part_type_id UUID REFERENCES public.part_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  visible BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create colors table for spare parts
CREATE TABLE public.spare_parts_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spare_part_id UUID NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.phone_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts_colors ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can view, admins can manage
CREATE POLICY "Anyone can view phone categories" ON public.phone_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage phone categories" ON public.phone_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view spare parts brands" ON public.spare_parts_brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage spare parts brands" ON public.spare_parts_brands FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view phone models" ON public.phone_models FOR SELECT USING (true);
CREATE POLICY "Admins can manage phone models" ON public.phone_models FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view part categories" ON public.part_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage part categories" ON public.part_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view part types" ON public.part_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage part types" ON public.part_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view visible spare parts" ON public.spare_parts FOR SELECT USING (visible = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage spare parts" ON public.spare_parts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view spare parts colors" ON public.spare_parts_colors FOR SELECT USING (true);
CREATE POLICY "Admins can manage spare parts colors" ON public.spare_parts_colors FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_spare_parts_updated_at
  BEFORE UPDATE ON public.spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_products_updated_at();

-- Insert default phone categories
INSERT INTO public.phone_categories (name) VALUES ('Android'), ('iPhone');

-- Insert default part categories
INSERT INTO public.part_categories (name) VALUES 
  ('LCD'),
  ('Touch'),
  ('Back Panel'),
  ('Battery'),
  ('Camera'),
  ('Motherboard'),
  ('Mic'),
  ('Speaker'),
  ('Charging Flex'),
  ('SIM Tray'),
  ('Lens'),
  ('Frame');