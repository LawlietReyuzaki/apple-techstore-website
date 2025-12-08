
-- Create shop_categories table for top-level categories
CREATE TABLE public.shop_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shop_brands table linked to categories
CREATE TABLE public.shop_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.shop_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create shop_models table linked to brands
CREATE TABLE public.shop_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.shop_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  series TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Create shop_part_types table for part categories within a category
CREATE TABLE public.shop_part_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.shop_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create shop_items table for actual products
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.shop_categories(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.shop_brands(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.shop_models(id) ON DELETE SET NULL,
  part_type_id UUID REFERENCES public.shop_part_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC,
  stock INTEGER DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  condition TEXT DEFAULT 'new',
  visible BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_part_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_categories
CREATE POLICY "Anyone can view shop categories" ON public.shop_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage shop categories" ON public.shop_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shop_brands
CREATE POLICY "Anyone can view shop brands" ON public.shop_brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage shop brands" ON public.shop_brands FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shop_models
CREATE POLICY "Anyone can view shop models" ON public.shop_models FOR SELECT USING (true);
CREATE POLICY "Admins can manage shop models" ON public.shop_models FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shop_part_types
CREATE POLICY "Anyone can view shop part types" ON public.shop_part_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage shop part types" ON public.shop_part_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shop_items
CREATE POLICY "Anyone can view visible shop items" ON public.shop_items FOR SELECT USING ((visible = true) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop items" ON public.shop_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for shop_items
CREATE TRIGGER update_shop_items_updated_at
  BEFORE UPDATE ON public.shop_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_products_updated_at();

-- Insert the 7 top-level categories
INSERT INTO public.shop_categories (name, slug, sort_order) VALUES
  ('Mobile Accessories', 'mobile-accessories', 1),
  ('Laptop Accessories', 'laptop-accessories', 2),
  ('Computer Accessories', 'computer-accessories', 3),
  ('New & Used Phones', 'new-used-phones', 4),
  ('Mobile Spare Parts', 'mobile-spare-parts', 5),
  ('Laptop & Computer Spare Parts', 'laptop-computer-spare-parts', 6),
  ('Protectors & Skins', 'protectors-skins', 7);

-- Insert brands for Mobile Accessories
INSERT INTO public.shop_brands (category_id, name)
SELECT c.id, b.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Audionic'), ('Baseus'), ('Remax'), ('Joyroom'), ('Anker'), ('Xiaomi'), ('Samsung'), ('Apple')) AS b(name)
WHERE c.slug = 'mobile-accessories';

-- Insert part types for Mobile Accessories
INSERT INTO public.shop_part_types (category_id, name)
SELECT c.id, p.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Handsfree'), ('Chargers'), ('Cables'), ('Power Banks'), ('Bluetooth Earbuds'), ('Car Chargers'), ('Mobile Holders')) AS p(name)
WHERE c.slug = 'mobile-accessories';

-- Insert brands for Laptop Accessories
INSERT INTO public.shop_brands (category_id, name)
SELECT c.id, b.name FROM public.shop_categories c
CROSS JOIN (VALUES ('HP'), ('Dell'), ('Lenovo'), ('Asus'), ('Acer'), ('Apple')) AS b(name)
WHERE c.slug = 'laptop-accessories';

-- Insert part types for Laptop Accessories
INSERT INTO public.shop_part_types (category_id, name)
SELECT c.id, p.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Laptop Chargers'), ('Keyboards'), ('Mouse'), ('Cooling Pad'), ('Laptop Bags')) AS p(name)
WHERE c.slug = 'laptop-accessories';

-- Insert brands for Computer Accessories
INSERT INTO public.shop_brands (category_id, name)
SELECT c.id, b.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Logitech'), ('Redragon'), ('A4Tech'), ('Razer')) AS b(name)
WHERE c.slug = 'computer-accessories';

-- Insert part types for Computer Accessories
INSERT INTO public.shop_part_types (category_id, name)
SELECT c.id, p.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Keyboards'), ('Mouse'), ('Speakers'), ('Webcams')) AS p(name)
WHERE c.slug = 'computer-accessories';

-- Insert brands for New & Used Phones
INSERT INTO public.shop_brands (category_id, name)
SELECT c.id, b.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Samsung'), ('Apple'), ('Infinix'), ('Tecno'), ('Vivo'), ('Oppo'), ('Xiaomi')) AS b(name)
WHERE c.slug = 'new-used-phones';

-- Insert models for Samsung (New & Used Phones)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, m.series FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES 
  ('Galaxy A10', 'A-series'), ('Galaxy A20', 'A-series'), ('Galaxy A30', 'A-series'), ('Galaxy A50', 'A-series'), ('Galaxy A70', 'A-series'),
  ('Galaxy S8', 'S-series'), ('Galaxy S9', 'S-series'), ('Galaxy S10', 'S-series'), ('Galaxy S20', 'S-series'), ('Galaxy S21', 'S-series'), ('Galaxy S22', 'S-series')
) AS m(name, series)
WHERE c.slug = 'new-used-phones' AND b.name = 'Samsung';

-- Insert models for Apple (New & Used Phones)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, NULL FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('iPhone 7'), ('iPhone 8'), ('iPhone X'), ('iPhone 11'), ('iPhone 12'), ('iPhone 13'), ('iPhone 14')) AS m(name)
WHERE c.slug = 'new-used-phones' AND b.name = 'Apple';

-- Insert models for Infinix
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, 'Hot series' FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('Hot 10'), ('Hot 11'), ('Hot 12'), ('Hot 20')) AS m(name)
WHERE c.slug = 'new-used-phones' AND b.name = 'Infinix';

-- Insert models for Vivo
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, 'Y-series' FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('Y20'), ('Y21'), ('Y33s'), ('Y50')) AS m(name)
WHERE c.slug = 'new-used-phones' AND b.name = 'Vivo';

-- Insert brands for Mobile Spare Parts
INSERT INTO public.shop_brands (category_id, name)
SELECT c.id, b.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Samsung'), ('Apple'), ('Vivo'), ('Oppo'), ('Xiaomi')) AS b(name)
WHERE c.slug = 'mobile-spare-parts';

-- Insert part types for Mobile Spare Parts
INSERT INTO public.shop_part_types (category_id, name)
SELECT c.id, p.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Battery'), ('LCD'), ('Touch'), ('Back Cover'), ('Camera'), ('Charging Jack'), ('Back Glass'), ('Camera Lens'), ('Display'), ('Housing'), ('Screen'), ('Mic'), ('Charging Flex'), ('Panel'), ('Casing'), ('Charging Port')) AS p(name)
WHERE c.slug = 'mobile-spare-parts';

-- Insert models for Samsung (Mobile Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, m.series FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES 
  ('A10', 'A-series'), ('A20', 'A-series'), ('A30', 'A-series'), ('A50', 'A-series'), ('A70', 'A-series'),
  ('S8', 'S-series'), ('S9', 'S-series'), ('S10', 'S-series'), ('S20', 'S-series'), ('S21', 'S-series'), ('S22', 'S-series')
) AS m(name, series)
WHERE c.slug = 'mobile-spare-parts' AND b.name = 'Samsung';

-- Insert models for Apple (Mobile Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, NULL FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('iPhone 6'), ('iPhone 7'), ('iPhone 8'), ('iPhone X'), ('iPhone 11'), ('iPhone 12'), ('iPhone 13'), ('iPhone 14')) AS m(name)
WHERE c.slug = 'mobile-spare-parts' AND b.name = 'Apple';

-- Insert models for Vivo (Mobile Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, m.series FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES 
  ('Y20', 'Y-series'), ('Y21', 'Y-series'), ('Y33s', 'Y-series'),
  ('V20', 'V-series'), ('V21', 'V-series'), ('V23', 'V-series')
) AS m(name, series)
WHERE c.slug = 'mobile-spare-parts' AND b.name = 'Vivo';

-- Insert models for Oppo (Mobile Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, NULL FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('A3s'), ('A5'), ('A52'), ('F9'), ('F15')) AS m(name)
WHERE c.slug = 'mobile-spare-parts' AND b.name = 'Oppo';

-- Insert models for Xiaomi (Mobile Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, NULL FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('Note 8'), ('Note 9'), ('Note 10'), ('Mi 11')) AS m(name)
WHERE c.slug = 'mobile-spare-parts' AND b.name = 'Xiaomi';

-- Insert brands for Laptop & Computer Spare Parts
INSERT INTO public.shop_brands (category_id, name)
SELECT c.id, b.name FROM public.shop_categories c
CROSS JOIN (VALUES ('HP'), ('Dell'), ('Lenovo'), ('Asus')) AS b(name)
WHERE c.slug = 'laptop-computer-spare-parts';

-- Insert part types for Laptop & Computer Spare Parts
INSERT INTO public.shop_part_types (category_id, name)
SELECT c.id, p.name FROM public.shop_categories c
CROSS JOIN (VALUES ('LCD'), ('Keyboard'), ('Battery'), ('Adapter'), ('Hinges'), ('SSD'), ('Keypad'), ('Cooling Fan'), ('Charger'), ('Screen'), ('Motherboard')) AS p(name)
WHERE c.slug = 'laptop-computer-spare-parts';

-- Insert models for HP (Laptop Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, m.series FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('ProBook 450', 'ProBook'), ('ProBook 640', 'ProBook'), ('EliteBook 840', 'EliteBook'), ('EliteBook 850', 'EliteBook')) AS m(name, series)
WHERE c.slug = 'laptop-computer-spare-parts' AND b.name = 'HP';

-- Insert models for Dell (Laptop Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, m.series FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('Inspiron 15', 'Inspiron'), ('Inspiron 14', 'Inspiron'), ('Latitude 5520', 'Latitude'), ('Latitude 7420', 'Latitude')) AS m(name, series)
WHERE c.slug = 'laptop-computer-spare-parts' AND b.name = 'Dell';

-- Insert models for Lenovo (Laptop Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, m.series FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('ThinkPad T14', 'ThinkPad'), ('ThinkPad X1', 'ThinkPad'), ('IdeaPad 3', 'IdeaPad'), ('IdeaPad 5', 'IdeaPad')) AS m(name, series)
WHERE c.slug = 'laptop-computer-spare-parts' AND b.name = 'Lenovo';

-- Insert models for Asus (Laptop Spare Parts)
INSERT INTO public.shop_models (brand_id, name, series)
SELECT b.id, m.name, m.series FROM public.shop_brands b
JOIN public.shop_categories c ON b.category_id = c.id
CROSS JOIN (VALUES ('VivoBook 15', 'VivoBook'), ('VivoBook 14', 'VivoBook'), ('ZenBook 14', 'ZenBook'), ('ZenBook Pro', 'ZenBook')) AS m(name, series)
WHERE c.slug = 'laptop-computer-spare-parts' AND b.name = 'Asus';

-- Insert brands for Protectors & Skins
INSERT INTO public.shop_brands (category_id, name)
SELECT c.id, b.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Samsung'), ('Apple'), ('Xiaomi'), ('Vivo'), ('HP'), ('Dell')) AS b(name)
WHERE c.slug = 'protectors-skins';

-- Insert part types for Protectors & Skins
INSERT INTO public.shop_part_types (category_id, name)
SELECT c.id, p.name FROM public.shop_categories c
CROSS JOIN (VALUES ('Tempered Glass'), ('9D Glass'), ('Mobile Skins'), ('Laptop Skins')) AS p(name)
WHERE c.slug = 'protectors-skins';
