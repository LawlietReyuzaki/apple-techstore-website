-- ============================================================
-- SEED DATA FOR DILBAR MOBILES (LOCAL POSTGRESQL)
-- Uses actual UUIDs from the local Docker PostgreSQL DB.
-- Run: docker exec -i mydatabase_postgres psql -U admin -d mydatabase < seed.sql
-- ============================================================

-- ============================================================
-- Existing data (DO NOT RE-INSERT, already seeded):
--   categories        (6 rows)
--   shop_categories   (7 rows)
--   shop_brands       (40 rows)
--   part_categories   (12 rows)
--   phone_categories  (2 rows: Android, iPhone)
--   payment_settings  (1 row)
-- ============================================================

-- ============================================================
-- 1. PART QUALITIES
-- ============================================================
INSERT INTO part_qualities (id, name, description, sort_order) VALUES
  (gen_random_uuid(), 'Original',  'Genuine OEM part from manufacturer',           1),
  (gen_random_uuid(), 'High Copy', 'Premium aftermarket with similar quality',      2),
  (gen_random_uuid(), 'Low Copy',  'Budget aftermarket part',                       3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. SPARE PARTS BRANDS
--    phone_categories: iPhone=3fab290e, Android=81d1d7e3
-- ============================================================
INSERT INTO spare_parts_brands (id, phone_category_id, name) VALUES
  (gen_random_uuid(), '3fab290e-833b-406c-ac5d-fd547d8b29cc', 'Apple'),
  (gen_random_uuid(), '81d1d7e3-f7a9-4efd-9bdf-470185adcdd3', 'Samsung'),
  (gen_random_uuid(), '81d1d7e3-f7a9-4efd-9bdf-470185adcdd3', 'Xiaomi'),
  (gen_random_uuid(), '81d1d7e3-f7a9-4efd-9bdf-470185adcdd3', 'Oppo'),
  (gen_random_uuid(), '81d1d7e3-f7a9-4efd-9bdf-470185adcdd3', 'Vivo')
ON CONFLICT (phone_category_id, name) DO NOTHING;

-- ============================================================
-- 3. PHONE MODELS (using spare_parts_brands via subquery)
-- ============================================================
INSERT INTO phone_models (id, brand_id, name)
SELECT gen_random_uuid(), b.id, m.model_name
FROM spare_parts_brands b
JOIN (VALUES
  ('Apple',   'iPhone 15 Pro'),
  ('Apple',   'iPhone 15'),
  ('Apple',   'iPhone 14 Pro'),
  ('Apple',   'iPhone 14'),
  ('Apple',   'iPhone 13'),
  ('Apple',   'iPhone 12'),
  ('Samsung', 'Galaxy S24 Ultra'),
  ('Samsung', 'Galaxy S24'),
  ('Samsung', 'Galaxy S23'),
  ('Samsung', 'Galaxy A55'),
  ('Samsung', 'Galaxy A35'),
  ('Xiaomi',  'Redmi Note 13 Pro'),
  ('Xiaomi',  'Redmi Note 12'),
  ('Oppo',    'Reno 7'),
  ('Vivo',    'V27 Pro')
) AS m(brand_name, model_name) ON b.name = m.brand_name
ON CONFLICT (brand_id, name) DO NOTHING;

-- ============================================================
-- 4. PRODUCTS
--    categories (local DB UUIDs):
--      Smartphones  = 0b8b61dd-65d1-4518-befe-f70d79aaf908
--      Used Phones  = 814af426-fd4a-44d2-924c-45999878ae62
--      Laptops      = 1fd34af0-8d3f-41a5-ac65-ddb6ca6cfd22
--      Accessories  = 0a054185-3c37-43d9-88f4-e34e5229a93e
-- ============================================================
INSERT INTO products (name, brand, category_id, description, price, stock, featured, images) VALUES
  -- New Smartphones
  ('iPhone 15 Pro 256GB Natural Titanium',
   'Apple', '0b8b61dd-65d1-4518-befe-f70d79aaf908',
   'iPhone 15 Pro with A17 Pro chip, titanium design, and Action button.',
   399999, 5, true,
   ARRAY['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708']),

  ('iPhone 15 128GB Black',
   'Apple', '0b8b61dd-65d1-4518-befe-f70d79aaf908',
   'iPhone 15 with Dynamic Island, 48MP camera, and USB-C.',
   329999, 8, true,
   ARRAY['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-black?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693009294082']),

  ('iPhone 14 Pro 256GB Deep Purple',
   'Apple', '0b8b61dd-65d1-4518-befe-f70d79aaf908',
   'iPhone 14 Pro with always-on display, Dynamic Island, and 48MP main camera.',
   289999, 3, false,
   ARRAY['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-7inch-deeppurple?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703841896']),

  ('Samsung Galaxy S24 Ultra 256GB Titanium Black',
   'Samsung', '0b8b61dd-65d1-4518-befe-f70d79aaf908',
   'Galaxy S24 Ultra with built-in S Pen, 200MP camera, Snapdragon 8 Gen 3.',
   379999, 6, true,
   ARRAY['https://images.samsung.com/is/image/samsung/p6pim/pk/2401/gallery/pk-galaxy-s24-ultra-s928-sm-s928bzkgpkd-thumb-539573408']),

  ('Samsung Galaxy A55 5G 256GB Awesome Navy',
   'Samsung', '0b8b61dd-65d1-4518-befe-f70d79aaf908',
   'Galaxy A55 5G with 50MP triple camera, 5000mAh battery, and 120Hz AMOLED.',
   84999, 15, false,
   ARRAY['https://images.samsung.com/is/image/samsung/p6pim/pk/sm-a556ezaapkd/gallery/pk-galaxy-a55-sm-a556-483050-sm-a556ezaapkd-thumb-539573408']),

  -- Used Phones
  ('iPhone 13 128GB (Used - Excellent)',
   'Apple', '814af426-fd4a-44d2-924c-45999878ae62',
   'Pre-owned iPhone 13 in excellent condition. Battery health 89%. Includes box.',
   149999, 2, false,
   ARRAY['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-finish-select-202207-6-1inch-midnight?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1655710652125']),

  ('Samsung Galaxy S23 (Used - Good)',
   'Samsung', '814af426-fd4a-44d2-924c-45999878ae62',
   'Pre-owned Galaxy S23 in good condition. Minor scratches. Battery health 82%.',
   74999, 1, false,
   ARRAY['https://images.samsung.com/is/image/samsung/p6pim/pk/sm-s911bzaipkd/gallery/pk-galaxy-s23-sm-s911-sm-s911bzaipkd-thumb-534824799']),

  -- Laptops
  ('MacBook Pro 14" M3 Pro 18GB RAM',
   'Apple', '1fd34af0-8d3f-41a5-ac65-ddb6ca6cfd22',
   'MacBook Pro 14-inch with M3 Pro chip, 18GB unified memory, 512GB SSD.',
   569999, 3, true,
   ARRAY['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311054290']),

  ('Dell XPS 15 Intel Core i7 16GB RAM',
   'Dell', '1fd34af0-8d3f-41a5-ac65-ddb6ca6cfd22',
   'Dell XPS 15 with 13th Gen Intel Core i7, 16GB DDR5, 512GB NVMe, OLED.',
   329999, 4, false,
   ARRAY['https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9530/media-gallery/black/laptop-xps-9530-t-black-gallery-4.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402']),

  -- Accessories
  ('Anker 20W USB-C Fast Charger',
   'Anker', '0a054185-3c37-43d9-88f4-e34e5229a93e',
   'Anker Nano III 20W USB-C compact charger. Charges iPhone 15 up to 50% in 30 mins.',
   3499, 50, false,
   ARRAY['https://m.media-amazon.com/images/I/51t4inRMb8L._AC_SL1500_.jpg']),

  ('Spigen Tough Armor Case iPhone 15 Pro',
   'Spigen', '0a054185-3c37-43d9-88f4-e34e5229a93e',
   'Military-grade drop protection for iPhone 15 Pro. Dual-layer with Air Cushion.',
   4999, 30, false,
   ARRAY['https://m.media-amazon.com/images/I/71v3N8w5jbL._AC_SL1500_.jpg']),

  ('Baseus 65W GaN 3-Port Charger',
   'Baseus', '0a054185-3c37-43d9-88f4-e34e5229a93e',
   'GaN5 Pro 65W wall charger with 2x USB-C + 1x USB-A. Charges laptop + phone.',
   5999, 25, true,
   ARRAY['https://m.media-amazon.com/images/I/61YrPLAOxSL._AC_SL1500_.jpg'])
;

-- ============================================================
-- 5. SHOP ITEMS
--    shop_categories (existing):
--      mobile-accessories: d507a73c-8093-4cbc-a492-1bfb13ae092e
--      laptop-accessories: 143d45b8-1d63-4a62-90d8-99ceb847da88
--      new-used-phones:    782b4749-9a69-409c-8b62-6b69a8dc7f81
--      protectors-skins:   9da91849-8d71-4dc0-814f-4c7b989456a0
--    shop_brands (existing, phones 782b4749):
--      Apple:   569f97cc-5ef7-43d2-b4ec-121ec7f3188e
--      Samsung: a6a9d067-f5c4-4017-a1bc-76dbcad56283
--      Xiaomi:  c2b6522e-27bd-4e25-86c3-0e1fe96e697e
-- ============================================================
INSERT INTO shop_items (category_id, brand_id, name, description, price, sale_price, stock, visible, featured, condition) VALUES
  ('d507a73c-8093-4cbc-a492-1bfb13ae092e',
   NULL,
   'Joyroom iPhone 15 Pro MagSafe Case',
   'Ultra-thin MagSafe compatible case. Military drop protection with magnetic ring.',
   2499, 1999, 40, true, true, 'new'),

  ('d507a73c-8093-4cbc-a492-1bfb13ae092e',
   NULL,
   'Baseus USB-C to USB-C 100W Braided Cable 2m',
   '100W fast charging braided cable with E-Mark chip. 2m. Laptops + phones.',
   1499, NULL, 60, true, false, 'new'),

  ('d507a73c-8093-4cbc-a492-1bfb13ae092e',
   NULL,
   'Anker PowerCore 20000mAh Power Bank',
   'Slim 20000mAh portable charger. PowerIQ 3.0 fast charging.',
   8999, 7499, 20, true, true, 'new'),

  ('9da91849-8d71-4dc0-814f-4c7b989456a0',
   NULL,
   'Spigen Tempered Glass iPhone 15 Pro (2 Pack)',
   'Case-friendly 9H tempered glass with EZ FIT applicator for iPhone 15 Pro.',
   1999, NULL, 45, true, false, 'new'),

  ('143d45b8-1d63-4a62-90d8-99ceb847da88',
   NULL,
   'Logitech MX Master 3S Wireless Mouse',
   'Advanced wireless mouse with 8K DPI, MagSpeed scrolling, 70-day battery.',
   14999, 12999, 15, true, true, 'new'),

  ('143d45b8-1d63-4a62-90d8-99ceb847da88',
   NULL,
   'Laptop Bag 15.6" Waterproof with USB Port',
   'Business backpack with USB charging port, anti-theft design, waterproof fabric.',
   4999, 3999, 25, true, false, 'new')
;

-- ============================================================
-- 6. SPARE PARTS (using subqueries to get model IDs)
--    part_categories (existing):
--      LCD:          2d79e4b5-8807-43e9-bc87-06c6046e1f46
--      Battery:      8f2d2c33-634f-4fff-9602-87279e2f6d4f
--      Charging Flex:7c70ef4d-174f-4618-a3ea-0cce6b710f72
--      Back Panel:   b2cbc69d-f631-414c-b7dc-08ef375abb6c
-- ============================================================
INSERT INTO spare_parts (phone_model_id, part_category_id, quality_id, name, description, price, stock, visible, featured, phone_model_name)
SELECT
  pm.id,
  sp.part_category_id,
  pq.id,
  sp.part_name,
  sp.description,
  sp.price,
  sp.stock,
  true,
  sp.featured,
  pm.name
FROM phone_models pm
JOIN spare_parts_brands spb ON pm.brand_id = spb.id
JOIN part_qualities pq ON pq.name = sp.quality
JOIN (VALUES
  ('Apple',   'iPhone 15 Pro',     '2d79e4b5-8807-43e9-bc87-06c6046e1f46'::uuid, 'iPhone 15 Pro OLED Screen Assembly',       'Original quality OLED display. Includes installation tools.',       18999, 10, true,  'Original'),
  ('Apple',   'iPhone 14 Pro',     '2d79e4b5-8807-43e9-bc87-06c6046e1f46'::uuid, 'iPhone 14 Pro OLED Screen Assembly',       'High quality OLED display for iPhone 14 Pro.',                     14999, 8,  false, 'High Copy'),
  ('Apple',   'iPhone 13',         '2d79e4b5-8807-43e9-bc87-06c6046e1f46'::uuid, 'iPhone 13 OLED Screen Assembly',           'Super Retina XDR quality for iPhone 13.',                          10999, 15, false, 'Original'),
  ('Apple',   'iPhone 12',         '2d79e4b5-8807-43e9-bc87-06c6046e1f46'::uuid, 'iPhone 12 OLED Screen Assembly',           'Compatible with all iPhone 12 variants.',                           7999, 20, false, 'High Copy'),
  ('Samsung', 'Galaxy S24 Ultra',  '2d79e4b5-8807-43e9-bc87-06c6046e1f46'::uuid, 'Samsung S24 Ultra AMOLED Screen',          'Dynamic AMOLED 2X display for Galaxy S24 Ultra.',                  22999, 5,  true,  'Original'),
  ('Samsung', 'Galaxy A55',        '2d79e4b5-8807-43e9-bc87-06c6046e1f46'::uuid, 'Samsung A55 Super AMOLED Screen',          'Super AMOLED 120Hz for Galaxy A55 5G.',                             8999, 12, false, 'High Copy'),
  ('Apple',   'iPhone 15 Pro',     '8f2d2c33-634f-4fff-9602-87279e2f6d4f'::uuid, 'iPhone 15 Pro Battery (3274mAh)',          'Genuine-quality 3274mAh Li-Ion battery.',                           4999, 25, true,  'Original'),
  ('Apple',   'iPhone 13',         '8f2d2c33-634f-4fff-9602-87279e2f6d4f'::uuid, 'iPhone 13 Battery (3227mAh)',              'High-quality 3227mAh replacement battery.',                         2999, 30, false, 'High Copy'),
  ('Samsung', 'Galaxy S24',        '8f2d2c33-634f-4fff-9602-87279e2f6d4f'::uuid, 'Samsung Galaxy S24 Battery (4000mAh)',     'Original quality 4000mAh battery for S24.',                         3499, 20, false, 'Original'),
  ('Apple',   'iPhone 15',         '7c70ef4d-174f-4618-a3ea-0cce6b710f72'::uuid, 'iPhone 15 USB-C Charging Port',           'USB-C port flex cable assembly. Fixes charging issues.',            2499, 18, false, 'High Copy'),
  ('Apple',   'iPhone 15 Pro',     'b2cbc69d-f631-414c-b7dc-08ef375abb6c'::uuid, 'iPhone 15 Pro Back Glass (Natural Titanium)','Original titanium back housing. Includes buttons.',              8999, 7,  false, 'Original')
) AS sp(brand_name, model_name, part_category_id, part_name, description, price, stock, featured, quality)
ON spb.name = sp.brand_name AND pm.name = sp.model_name
;

-- ============================================================
-- 7. REPAIRS (sample repair bookings — no customer fields in schema,
--    storing customer info in description/notes as JSON)
-- ============================================================
INSERT INTO repairs (tracking_code, device_make, device_model, issue, status, estimated_cost, description) VALUES
  ('DM-2024-001', 'Apple',   'iPhone 14 Pro',    'Screen cracked - needs replacement', 'in_progress', 14500,
   'Customer: Ahmed Hassan (03001234567). Screen has cracks top-right. Touch still works partially.'),

  ('DM-2024-002', 'Samsung', 'Galaxy S23',        'Battery draining too fast',          'created',     3200,
   'Customer: Sara Malik (03011234567). Battery drops 100% to 20% within 3 hours.'),

  ('DM-2024-003', 'Apple',   'iPhone 13',         'Charging port not working',          'completed',   2500,
   'Customer: Bilal Ahmed (03021234567). USB-C port replaced. Phone charges normally now.'),

  ('DM-2024-004', 'Xiaomi',  'Redmi Note 12',     'Back camera blurry',                 'created',     4500,
   'Customer: Fatima Khan (03031234567). Main camera blurry, front camera fine.'),

  ('DM-2024-005', 'Samsung', 'Galaxy A55',        'Phone not turning on',               'in_progress', 8000,
   'Customer: Usman Ali (03041234567). Water damage. Board may need micro-soldering.')
ON CONFLICT (tracking_code) DO NOTHING;

-- ============================================================
-- 8. ORDERS + PAYMENTS (sample data)
--    orders payment_method check: cod | stripe | card
--    orders payment_status check: unpaid | paid | refunded
--    orders status check: pending | processing | shipped | delivered | cancelled
--    payments payment_method enum: easypaisa | jazzcash | bank_transfer | cod
--    payments status enum: pending | approved | declined | refunded
-- ============================================================
-- Step A: Insert orders (payment_id = NULL initially)
INSERT INTO orders (id, customer_name, customer_phone, customer_email, delivery_address, total_amount, status, payment_method, payment_status)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Ahmed Hassan', '03001234567', 'ahmed@email.com',
   'House 12, Street 5, G-9/4, Islamabad',   399999, 'processing', 'cod', 'paid'),
  ('11111111-1111-1111-1111-111111111102', 'Sara Malik',   '03011234567', 'sara@email.com',
   'Flat 3B, Block C, Gulshan-e-Iqbal, Karachi', 84999, 'pending',    'cod', 'unpaid'),
  ('11111111-1111-1111-1111-111111111103', 'Bilal Ahmed',  '03021234567', 'bilal@email.com',
   'Plot 45, Phase 6, DHA Lahore',            2999,  'delivered',  'cod', 'paid'),
  ('11111111-1111-1111-1111-111111111104', 'Fatima Khan',  '03031234567', 'fatima@email.com',
   'House 7, Sector F-7, Islamabad',          329999, 'pending',    'cod', 'unpaid'),
  ('11111111-1111-1111-1111-111111111105', 'Usman Ali',    '03041234567', 'usman@email.com',
   'Shop 12, Tariq Road, Karachi',            14999, 'cancelled',  'cod', 'refunded')
ON CONFLICT (id) DO NOTHING;

-- Step B: Insert order items (each order item must have exactly one of product_id/spare_part_id/shop_item_id)
INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal, item_type)
SELECT
  '11111111-1111-1111-1111-111111111101', p.id, p.name, p.price, 1, p.price, 'product'
FROM products p WHERE p.name = 'iPhone 15 Pro 256GB Natural Titanium' LIMIT 1;

INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal, item_type)
SELECT
  '11111111-1111-1111-1111-111111111102', p.id, p.name, p.price, 1, p.price, 'product'
FROM products p WHERE p.name = 'Samsung Galaxy A55 5G 256GB Awesome Navy' LIMIT 1;

INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal, item_type)
SELECT
  '11111111-1111-1111-1111-111111111103', p.id, p.name, p.price, 1, p.price, 'product'
FROM products p WHERE p.name = 'Anker 20W USB-C Fast Charger' LIMIT 1;

INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal, item_type)
SELECT
  '11111111-1111-1111-1111-111111111104', p.id, p.name, p.price, 1, p.price, 'product'
FROM products p WHERE p.name = 'Dell XPS 15 Intel Core i7 16GB RAM' LIMIT 1;

-- Step C: Insert payments (referencing orders)
INSERT INTO payments (id, order_id, transaction_id, sender_number, amount, payment_method, status) VALUES
  ('22222222-2222-2222-2222-222222222201',
   '11111111-1111-1111-1111-111111111101', 'COD-2024-001', '03001234567', 399999, 'cod', 'approved'),
  ('22222222-2222-2222-2222-222222222203',
   '11111111-1111-1111-1111-111111111103', 'COD-2024-003', '03021234567', 2999,   'cod', 'approved'),
  ('22222222-2222-2222-2222-222222222205',
   '11111111-1111-1111-1111-111111111105', 'COD-2024-005', '03041234567', 14999,  'cod', 'refunded')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. UPDATE PAYMENT SETTINGS (update the existing row)
-- ============================================================
UPDATE payment_settings SET
  easypaisa_number      = '03001234567',
  jazzcash_number       = '03001234567',
  bank_name             = 'Meezan Bank',
  bank_account_name     = 'Dilbar Mobiles',
  bank_account_number   = '1234567890123456',
  iban                  = 'PK36MEZN0001234567890123',
  delivery_charges      = 250,
  service_fees          = 0,
  wallet_transfer_charges = 0,
  additional_instructions = 'Please send payment to the number above and upload a screenshot of your transaction. Orders are processed within 24 hours.',
  enable_easypaisa      = true,
  enable_jazzcash       = true,
  enable_bank_transfer  = true,
  enable_cod            = true
;

-- ============================================================
-- 10. PART REQUESTS
-- ============================================================
INSERT INTO part_requests (name, email, phone, category, part_name, part_details, status)
SELECT 'Kamran Akhtar', 'kamran@email.com', '03051234567', 'Apple',   'iPhone 15 Pro Max Screen',    'Original OLED, Face ID must work', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM part_requests WHERE email = 'kamran@email.com');

INSERT INTO part_requests (name, email, phone, category, part_name, part_details, status)
SELECT 'Ayesha Noor', 'ayesha@email.com', '03061234567', 'Samsung', 'Galaxy S24 Ultra Back Glass', 'Titanium color preferred', 'contacted'
WHERE NOT EXISTS (SELECT 1 FROM part_requests WHERE email = 'ayesha@email.com');

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT
  'products'           AS table_name, COUNT(*) AS rows FROM products          UNION ALL
SELECT 'shop_items',                  COUNT(*) FROM shop_items                UNION ALL
SELECT 'spare_parts',                 COUNT(*) FROM spare_parts               UNION ALL
SELECT 'spare_parts_brands',          COUNT(*) FROM spare_parts_brands        UNION ALL
SELECT 'phone_models',                COUNT(*) FROM phone_models              UNION ALL
SELECT 'part_qualities',              COUNT(*) FROM part_qualities             UNION ALL
SELECT 'orders',                      COUNT(*) FROM orders                    UNION ALL
SELECT 'order_items',                 COUNT(*) FROM order_items               UNION ALL
SELECT 'payments',                    COUNT(*) FROM payments                  UNION ALL
SELECT 'repairs',                     COUNT(*) FROM repairs                   UNION ALL
SELECT 'part_requests',               COUNT(*) FROM part_requests
ORDER BY table_name;
