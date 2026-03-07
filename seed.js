#!/usr/bin/env node
/**
 * seed.js — Seed the Supabase database via the REST API
 *
 * USAGE:
 *   node seed.js                          # Uses anon key (may fail on RLS-protected tables)
 *   SUPABASE_SERVICE_KEY=<key> node seed.js  # Uses service_role key — bypasses RLS (recommended)
 *
 * HOW TO GET THE SERVICE ROLE KEY:
 *   1. Go to https://supabase.com/dashboard/project/ekqgsyzxkkrlgzhavnoy/settings/api
 *   2. Copy the "service_role" key (secret — never commit to git)
 *   3. Run: SUPABASE_SERVICE_KEY="your_key_here" node seed.js
 *
 * NOTE: If you get 403 / RLS errors, use the SQL approach instead:
 *   Paste seed.sql into the Supabase SQL Editor at:
 *   https://supabase.com/dashboard/project/ekqgsyzxkkrlgzhavnoy/sql
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekqgsyzxkkrlgzhavnoy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcWdzeXp4a2tybGd6aGF2bm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzEwNzUsImV4cCI6MjA3NjQ0NzA3NX0.AylzcWDaFNXCXKlt825e0ZpMF0B54-Vya3SEfDng0Zw';

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  Warning: Using anon key. Some inserts may fail due to Row Level Security.');
  console.warn('   For best results run: SUPABASE_SERVICE_KEY="<key>" node seed.js\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[36m', bold: '\x1b[1m', reset: '\x1b[0m'
};
const log = (msg, c = 'reset') => console.log(`${colors[c]}${msg}${colors.reset}`);

async function upsert(table, rows, label) {
  process.stdout.write(`  Seeding ${table.padEnd(22)} `);
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) {
    console.log(`${colors.red}✗ FAILED: ${error.message}${colors.reset}`);
    return false;
  }
  console.log(`${colors.green}✓ ${rows.length} row(s)${colors.reset}`);
  return true;
}

async function check(table) {
  const { data, error } = await supabase.from(table).select('id').limit(5);
  if (error) return `ERROR: ${error.message}`;
  return `${data?.length ?? 0} rows (showing up to 5)`;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

async function seed() {
  log('\n╔══════════════════════════════════════════════╗', 'bold');
  log('║     DILBAR MOBILES — DATABASE SEED SCRIPT    ║', 'bold');
  log('╚══════════════════════════════════════════════╝\n', 'bold');

  let ok = 0, fail = 0;
  const run = async (table, rows) => (await upsert(table, rows)) ? ok++ : fail++;

  // 1. Categories (hardcoded UUIDs match Shop.tsx)
  await run('categories', [
    { id: '6065ce07-0cc9-4609-8faa-c6e45897b898', name: 'Mobile Accessories',  description: 'Accessories for mobile phones' },
    { id: '739f7b1d-0408-4ebe-85b7-d8caf128f18f', name: 'Laptops',             description: 'Laptops and accessories' },
    { id: '96dd7488-f9d0-43cd-8db9-998be0c29a50', name: 'Smartphones',         description: 'New smartphones' },
    { id: 'd6cedc35-4e44-4392-8483-b1ab8f2c11df', name: 'Used Phones',         description: 'Pre-owned phones' },
  ]);

  // 2. Shop categories
  await run('shop_categories', [
    { id: 'cat-phones-001', name: 'New & Used Phones',  slug: 'new-used-phones',    description: 'Smartphones new and pre-owned', sort_order: 1 },
    { id: 'cat-laptop-001', name: 'Laptops',            slug: 'laptops',            description: 'Laptops for every budget',       sort_order: 2 },
    { id: 'cat-access-001', name: 'Mobile Accessories', slug: 'mobile-accessories', description: 'Cases, chargers, cables',        sort_order: 3 },
    { id: 'cat-spare-001',  name: 'Mobile Spare Parts', slug: 'mobile-spare-parts', description: 'Replacement parts',              sort_order: 4 },
    { id: 'cat-lapac-001',  name: 'Laptop Accessories', slug: 'laptop-accessories', description: 'Bags, mice, keyboards',          sort_order: 5 },
  ]);

  // 3. Phone categories
  await run('phone_categories', [
    { id: 'pc-apple-001',   name: 'Apple' },
    { id: 'pc-samsung-001', name: 'Samsung' },
    { id: 'pc-xiaomi-001',  name: 'Xiaomi / Redmi' },
    { id: 'pc-oppo-001',    name: 'Oppo / Realme' },
    { id: 'pc-vivo-001',    name: 'Vivo' },
  ]);

  // 4. Part categories
  await run('part_categories', [
    { id: 'pcat-screen-001',  name: 'Screens & Displays' },
    { id: 'pcat-battery-001', name: 'Batteries' },
    { id: 'pcat-camera-001',  name: 'Cameras' },
    { id: 'pcat-charge-001',  name: 'Charging Ports' },
    { id: 'pcat-back-001',    name: 'Back Glass & Housing' },
    { id: 'pcat-speaker-001', name: 'Speakers & Mics' },
    { id: 'pcat-button-001',  name: 'Buttons & Flex Cables' },
  ]);

  // 5. Part qualities
  await run('part_qualities', [
    { id: 'pq-orig-001', name: 'Original',  description: 'Genuine OEM part',            sort_order: 1 },
    { id: 'pq-high-001', name: 'High Copy', description: 'Premium aftermarket',          sort_order: 2 },
    { id: 'pq-low-001',  name: 'Low Copy',  description: 'Budget aftermarket',           sort_order: 3 },
  ]);

  // 6. Spare parts brands
  await run('spare_parts_brands', [
    { id: 'spb-apple-001',   name: 'Apple',   phone_category_id: 'pc-apple-001' },
    { id: 'spb-samsung-001', name: 'Samsung', phone_category_id: 'pc-samsung-001' },
    { id: 'spb-xiaomi-001',  name: 'Xiaomi',  phone_category_id: 'pc-xiaomi-001' },
    { id: 'spb-oppo-001',    name: 'Oppo',    phone_category_id: 'pc-oppo-001' },
    { id: 'spb-vivo-001',    name: 'Vivo',    phone_category_id: 'pc-vivo-001' },
  ]);

  // 7. Phone models
  await run('phone_models', [
    { id: 'pm-ip15pro-001', name: 'iPhone 15 Pro',     brand_id: 'spb-apple-001' },
    { id: 'pm-ip15-001',    name: 'iPhone 15',          brand_id: 'spb-apple-001' },
    { id: 'pm-ip14pro-001', name: 'iPhone 14 Pro',     brand_id: 'spb-apple-001' },
    { id: 'pm-ip14-001',    name: 'iPhone 14',          brand_id: 'spb-apple-001' },
    { id: 'pm-ip13-001',    name: 'iPhone 13',          brand_id: 'spb-apple-001' },
    { id: 'pm-ip12-001',    name: 'iPhone 12',          brand_id: 'spb-apple-001' },
    { id: 'pm-s24u-001',    name: 'Galaxy S24 Ultra',  brand_id: 'spb-samsung-001' },
    { id: 'pm-s24-001',     name: 'Galaxy S24',         brand_id: 'spb-samsung-001' },
    { id: 'pm-s23-001',     name: 'Galaxy S23',         brand_id: 'spb-samsung-001' },
    { id: 'pm-a55-001',     name: 'Galaxy A55',         brand_id: 'spb-samsung-001' },
    { id: 'pm-a35-001',     name: 'Galaxy A35',         brand_id: 'spb-samsung-001' },
    { id: 'pm-r13pro-001',  name: 'Redmi Note 13 Pro', brand_id: 'spb-xiaomi-001' },
    { id: 'pm-r12-001',     name: 'Redmi Note 12',     brand_id: 'spb-xiaomi-001' },
    { id: 'pm-or7-001',     name: 'Reno 7',             brand_id: 'spb-oppo-001' },
    { id: 'pm-vv27-001',    name: 'V27 Pro',            brand_id: 'spb-vivo-001' },
  ]);

  // 8. Part types
  await run('part_types', [
    { id: 'pt-oled-001',   name: 'OLED Display',      category_id: 'pcat-screen-001' },
    { id: 'pt-lcd-001',    name: 'LCD Display',       category_id: 'pcat-screen-001' },
    { id: 'pt-amoled-001', name: 'AMOLED Display',    category_id: 'pcat-screen-001' },
    { id: 'pt-li-001',     name: 'Li-Ion Battery',    category_id: 'pcat-battery-001' },
    { id: 'pt-lipl-001',   name: 'Li-Polymer Battery',category_id: 'pcat-battery-001' },
    { id: 'pt-rear-001',   name: 'Rear Camera',       category_id: 'pcat-camera-001' },
    { id: 'pt-front-001',  name: 'Front Camera',      category_id: 'pcat-camera-001' },
    { id: 'pt-usbc-001',   name: 'USB-C Port',        category_id: 'pcat-charge-001' },
    { id: 'pt-light-001',  name: 'Lightning Port',    category_id: 'pcat-charge-001' },
  ]);

  // 9. Shop brands
  await run('shop_brands', [
    { id: 'sb-apple-001',    name: 'Apple',    category_id: 'cat-phones-001' },
    { id: 'sb-samsung-001',  name: 'Samsung',  category_id: 'cat-phones-001' },
    { id: 'sb-xiaomi-001',   name: 'Xiaomi',   category_id: 'cat-phones-001' },
    { id: 'sb-oppo-001',     name: 'Oppo',     category_id: 'cat-phones-001' },
    { id: 'sb-vivo-001',     name: 'Vivo',     category_id: 'cat-phones-001' },
    { id: 'sb-dell-001',     name: 'Dell',     category_id: 'cat-laptop-001' },
    { id: 'sb-hp-001',       name: 'HP',       category_id: 'cat-laptop-001' },
    { id: 'sb-lenovo-001',   name: 'Lenovo',   category_id: 'cat-laptop-001' },
    { id: 'sb-macbook-001',  name: 'Apple',    category_id: 'cat-laptop-001' },
    { id: 'sb-anker-001',    name: 'Anker',    category_id: 'cat-access-001' },
    { id: 'sb-baseus-001',   name: 'Baseus',   category_id: 'cat-access-001' },
    { id: 'sb-joyroom-001',  name: 'Joyroom',  category_id: 'cat-access-001' },
    { id: 'sb-spigen-001',   name: 'Spigen',   category_id: 'cat-access-001' },
    { id: 'sb-lapgen-001',   name: 'Generic',  category_id: 'cat-lapac-001' },
    { id: 'sb-logitech-001', name: 'Logitech', category_id: 'cat-lapac-001' },
  ]);

  // 10. Shop models
  await run('shop_models', [
    { id: 'sm-ip15pro-001', name: 'iPhone 15 Pro',   series: 'iPhone 15',  brand_id: 'sb-apple-001' },
    { id: 'sm-ip15-001',    name: 'iPhone 15',        series: 'iPhone 15',  brand_id: 'sb-apple-001' },
    { id: 'sm-ip14pro-001', name: 'iPhone 14 Pro',   series: 'iPhone 14',  brand_id: 'sb-apple-001' },
    { id: 'sm-ip14-001',    name: 'iPhone 14',        series: 'iPhone 14',  brand_id: 'sb-apple-001' },
    { id: 'sm-ip13-001',    name: 'iPhone 13',        series: 'iPhone 13',  brand_id: 'sb-apple-001' },
    { id: 'sm-s24u-001',    name: 'Galaxy S24 Ultra', series: 'S24 Series', brand_id: 'sb-samsung-001' },
    { id: 'sm-s24-001',     name: 'Galaxy S24',       series: 'S24 Series', brand_id: 'sb-samsung-001' },
    { id: 'sm-a55-001',     name: 'Galaxy A55',       series: 'A Series',   brand_id: 'sb-samsung-001' },
    { id: 'sm-r13pro-001',  name: 'Redmi Note 13 Pro',series: 'Note 13',    brand_id: 'sb-xiaomi-001' },
  ]);

  // 11. Shop part types
  await run('shop_part_types', [
    { id: 'spt-screen-001',  name: 'Screen',           category_id: 'cat-spare-001' },
    { id: 'spt-battery-001', name: 'Battery',          category_id: 'cat-spare-001' },
    { id: 'spt-charger-001', name: 'Charger',          category_id: 'cat-access-001' },
    { id: 'spt-cable-001',   name: 'Cable',            category_id: 'cat-access-001' },
    { id: 'spt-case-001',    name: 'Phone Case',       category_id: 'cat-access-001' },
    { id: 'spt-glass-001',   name: 'Screen Protector', category_id: 'cat-access-001' },
  ]);

  // 12. Products
  await run('products', [
    { id: 'prod-ip15pro-001', name: 'iPhone 15 Pro 256GB Natural Titanium', brand: 'Apple',   category_id: '96dd7488-f9d0-43cd-8db9-998be0c29a50', description: 'The latest iPhone 15 Pro with A17 Pro chip and titanium design.', price: 399999, sale_price: 389999, stock: 5,  featured: true,  on_sale: true,  images: ['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=640&hei=360&fmt=p-jpg&qlt=80&.v=1692845702708'] },
    { id: 'prod-ip15-001',    name: 'iPhone 15 128GB Black',                brand: 'Apple',   category_id: '96dd7488-f9d0-43cd-8db9-998be0c29a50', description: 'iPhone 15 with Dynamic Island, 48MP camera, and USB-C.',          price: 329999, sale_price: null,   stock: 8,  featured: true,  on_sale: false, images: ['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-black?wid=640&hei=360&fmt=p-jpg&qlt=80&.v=1693009294082'] },
    { id: 'prod-ip14pro-001', name: 'iPhone 14 Pro 256GB Deep Purple',      brand: 'Apple',   category_id: '96dd7488-f9d0-43cd-8db9-998be0c29a50', description: 'iPhone 14 Pro with always-on display and Dynamic Island.',       price: 289999, sale_price: 279999, stock: 3,  featured: false, on_sale: true,  images: ['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-7inch-deeppurple?wid=640&hei=360&fmt=p-jpg&qlt=80&.v=1663703841896'] },
    { id: 'prod-s24u-001',    name: 'Samsung Galaxy S24 Ultra 256GB',       brand: 'Samsung', category_id: '96dd7488-f9d0-43cd-8db9-998be0c29a50', description: 'Galaxy S24 Ultra with built-in S Pen and 200MP camera.',          price: 379999, sale_price: null,   stock: 6,  featured: true,  on_sale: false, images: ['https://images.samsung.com/is/image/samsung/p6pim/pk/2401/gallery/pk-galaxy-s24-ultra-s928-sm-s928bzkgpkd-thumb-539573408'] },
    { id: 'prod-a55-001',     name: 'Samsung Galaxy A55 5G 256GB',          brand: 'Samsung', category_id: '96dd7488-f9d0-43cd-8db9-998be0c29a50', description: 'Galaxy A55 5G with 50MP triple camera and 5000mAh battery.',      price: 84999,  sale_price: 79999,  stock: 15, featured: false, on_sale: true,  images: ['https://images.samsung.com/is/image/samsung/p6pim/pk/sm-a556ezaapkd/gallery/pk-galaxy-a55-sm-a556-483050-sm-a556ezaapkd-thumb-539573408'] },
    { id: 'prod-ip13used-001',name: 'iPhone 13 128GB (Used - Excellent)',   brand: 'Apple',   category_id: 'd6cedc35-4e44-4392-8483-b1ab8f2c11df', description: 'Pre-owned iPhone 13. Battery health 89%. Includes box.',         price: 149999, sale_price: null,   stock: 2,  featured: false, on_sale: false, images: [] },
    { id: 'prod-s23used-001', name: 'Samsung Galaxy S23 (Used - Good)',     brand: 'Samsung', category_id: 'd6cedc35-4e44-4392-8483-b1ab8f2c11df', description: 'Pre-owned Galaxy S23 in good condition. Battery health 82%.',   price: 74999,  sale_price: 69999,  stock: 1,  featured: false, on_sale: true,  images: [] },
    { id: 'prod-mbpro-001',   name: 'MacBook Pro 14" M3 Pro 18GB RAM',      brand: 'Apple',   category_id: '739f7b1d-0408-4ebe-85b7-d8caf128f18f', description: 'MacBook Pro 14-inch with M3 Pro chip, 18GB unified memory.',    price: 569999, sale_price: null,   stock: 3,  featured: true,  on_sale: false, images: [] },
    { id: 'prod-dell-001',    name: 'Dell XPS 15 Intel Core i7 16GB',       brand: 'Dell',    category_id: '739f7b1d-0408-4ebe-85b7-d8caf128f18f', description: 'Dell XPS 15 with 13th Gen Core i7, 512GB NVMe SSD, OLED.',      price: 329999, sale_price: 309999, stock: 4,  featured: false, on_sale: true,  images: [] },
    { id: 'prod-anker-001',   name: 'Anker 20W USB-C Fast Charger',         brand: 'Anker',   category_id: '6065ce07-0cc9-4609-8faa-c6e45897b898', description: 'Anker Nano III 20W compact USB-C charger.',                       price: 3499,   sale_price: 2999,   stock: 50, featured: false, on_sale: true,  images: [] },
    { id: 'prod-spigen-001',  name: 'Spigen Tough Armor Case iPhone 15 Pro',brand: 'Spigen',  category_id: '6065ce07-0cc9-4609-8faa-c6e45897b898', description: 'Military-grade drop protection for iPhone 15 Pro.',               price: 4999,   sale_price: null,   stock: 30, featured: false, on_sale: false, images: [] },
    { id: 'prod-baseus-001',  name: 'Baseus 65W GaN 3-Port Charger',        brand: 'Baseus',  category_id: '6065ce07-0cc9-4609-8faa-c6e45897b898', description: 'GaN5 Pro 65W wall charger — charges laptop + phone + earbuds.',  price: 5999,   sale_price: 4999,   stock: 25, featured: true,  on_sale: true,  images: [] },
  ]);

  // 13. Product colors
  await run('product_colors', [
    { id: 'pc-ip15pro-nt',  product_id: 'prod-ip15pro-001', color_name: 'Natural Titanium', color_code: '#E8D5B0' },
    { id: 'pc-ip15pro-bt',  product_id: 'prod-ip15pro-001', color_name: 'Black Titanium',   color_code: '#3C3C3E' },
    { id: 'pc-ip15pro-wt',  product_id: 'prod-ip15pro-001', color_name: 'White Titanium',   color_code: '#F0EEE8' },
    { id: 'pc-ip15-blk',    product_id: 'prod-ip15-001',    color_name: 'Black',            color_code: '#1C1C1E' },
    { id: 'pc-ip15-blue',   product_id: 'prod-ip15-001',    color_name: 'Blue',             color_code: '#A2B4C6' },
    { id: 'pc-ip15-grn',    product_id: 'prod-ip15-001',    color_name: 'Green',            color_code: '#4A7B5E' },
    { id: 'pc-s24u-blk',    product_id: 'prod-s24u-001',    color_name: 'Titanium Black',   color_code: '#2C2C2E' },
    { id: 'pc-s24u-gry',    product_id: 'prod-s24u-001',    color_name: 'Titanium Gray',    color_code: '#8C8C8C' },
    { id: 'pc-s24u-vlt',    product_id: 'prod-s24u-001',    color_name: 'Titanium Violet',  color_code: '#7B5EA7' },
  ]);

  // 14. Spare parts
  await run('spare_parts', [
    { id: 'sp-ip15pro-scr-001', name: 'iPhone 15 Pro OLED Screen Assembly', part_category_id: 'pcat-screen-001',  phone_model_id: 'pm-ip15pro-001', phone_model_name: 'iPhone 15 Pro',    price: 18999, stock: 10, visible: true, featured: true,  quality_id: 'pq-orig-001', description: 'Original quality OLED display with Face ID.' },
    { id: 'sp-ip14pro-scr-001', name: 'iPhone 14 Pro OLED Screen Assembly', part_category_id: 'pcat-screen-001',  phone_model_id: 'pm-ip14pro-001', phone_model_name: 'iPhone 14 Pro',   price: 14999, stock: 8,  visible: true, featured: false, quality_id: 'pq-high-001', description: 'High quality OLED display for iPhone 14 Pro.' },
    { id: 'sp-ip13-scr-001',    name: 'iPhone 13 OLED Screen Assembly',     part_category_id: 'pcat-screen-001',  phone_model_id: 'pm-ip13-001',    phone_model_name: 'iPhone 13',       price: 10999, stock: 15, visible: true, featured: false, quality_id: 'pq-orig-001', description: 'OLED display for iPhone 13.' },
    { id: 'sp-ip12-scr-001',    name: 'iPhone 12 OLED Screen Assembly',     part_category_id: 'pcat-screen-001',  phone_model_id: 'pm-ip12-001',    phone_model_name: 'iPhone 12',       price: 7999,  stock: 20, visible: true, featured: false, quality_id: 'pq-high-001', description: 'OLED display for iPhone 12.' },
    { id: 'sp-s24u-scr-001',    name: 'Samsung S24 Ultra AMOLED Screen',    part_category_id: 'pcat-screen-001',  phone_model_id: 'pm-s24u-001',    phone_model_name: 'Galaxy S24 Ultra',price: 22999, stock: 5,  visible: true, featured: true,  quality_id: 'pq-orig-001', description: 'Dynamic AMOLED 2X with S Pen digitizer.' },
    { id: 'sp-a55-scr-001',     name: 'Samsung A55 Super AMOLED Screen',    part_category_id: 'pcat-screen-001',  phone_model_id: 'pm-a55-001',     phone_model_name: 'Galaxy A55',     price: 8999,  stock: 12, visible: true, featured: false, quality_id: 'pq-high-001', description: 'Super AMOLED 120Hz display for Galaxy A55.' },
    { id: 'sp-ip15pro-bat-001', name: 'iPhone 15 Pro Battery (3274mAh)',    part_category_id: 'pcat-battery-001', phone_model_id: 'pm-ip15pro-001', phone_model_name: 'iPhone 15 Pro',   price: 4999,  stock: 25, visible: true, featured: true,  quality_id: 'pq-orig-001', description: 'Genuine-quality battery for iPhone 15 Pro.' },
    { id: 'sp-ip13-bat-001',    name: 'iPhone 13 Battery (3227mAh)',        part_category_id: 'pcat-battery-001', phone_model_id: 'pm-ip13-001',    phone_model_name: 'iPhone 13',       price: 2999,  stock: 30, visible: true, featured: false, quality_id: 'pq-high-001', description: 'Replacement battery for iPhone 13.' },
    { id: 'sp-s24-bat-001',     name: 'Samsung Galaxy S24 Battery (4000mAh)',part_category_id: 'pcat-battery-001',phone_model_id: 'pm-s24-001',    phone_model_name: 'Galaxy S24',     price: 3499,  stock: 20, visible: true, featured: false, quality_id: 'pq-orig-001', description: 'Original quality battery for Galaxy S24.' },
    { id: 'sp-ip15-usbc-001',   name: 'iPhone 15 USB-C Charging Port',     part_category_id: 'pcat-charge-001',  phone_model_id: 'pm-ip15-001',    phone_model_name: 'iPhone 15',       price: 2499,  stock: 18, visible: true, featured: false, quality_id: 'pq-high-001', description: 'USB-C charging port flex cable for iPhone 15.' },
    { id: 'sp-ip15pro-back-001',name: 'iPhone 15 Pro Back Glass (Titanium)',part_category_id: 'pcat-back-001',   phone_model_id: 'pm-ip15pro-001', phone_model_name: 'iPhone 15 Pro',   price: 8999,  stock: 7,  visible: true, featured: false, quality_id: 'pq-orig-001', description: 'Titanium back housing for iPhone 15 Pro.' },
  ]);

  // 15. Shop items
  await run('shop_items', [
    { id: 'si-joycase-001',      name: 'Joyroom iPhone 15 Pro MagSafe Case',         category_id: 'cat-access-001', brand_id: 'sb-joyroom-001',  model_id: 'sm-ip15pro-001', price: 2499, sale_price: 1999, stock: 40, visible: true, featured: true,  condition: 'new', description: 'Ultra-thin MagSafe compatible case.' },
    { id: 'si-baseus-cable-001', name: 'Baseus USB-C 100W Braided Cable 2m',          category_id: 'cat-access-001', brand_id: 'sb-baseus-001',   model_id: null,             price: 1499, sale_price: null, stock: 60, visible: true, featured: false, condition: 'new', description: '100W fast charging cable with E-Mark chip.' },
    { id: 'si-anker-pb-001',     name: 'Anker PowerCore 20000mAh Power Bank',         category_id: 'cat-access-001', brand_id: 'sb-anker-001',    model_id: null,             price: 8999, sale_price: 7499, stock: 20, visible: true, featured: true,  condition: 'new', description: '20000mAh portable charger with PowerIQ 3.0.' },
    { id: 'si-spigen-glass-001', name: 'Spigen Tempered Glass iPhone 15 Pro (2 Pack)',category_id: 'cat-access-001', brand_id: 'sb-spigen-001',   model_id: 'sm-ip15pro-001', price: 1999, sale_price: null, stock: 45, visible: true, featured: false, condition: 'new', description: '9H hardness tempered glass with EZ FIT.' },
    { id: 'si-logitech-m3s-001', name: 'Logitech MX Master 3S Wireless Mouse',        category_id: 'cat-lapac-001',  brand_id: 'sb-logitech-001', model_id: null,             price: 14999,sale_price: 12999,stock: 15, visible: true, featured: true,  condition: 'new', description: 'Advanced wireless mouse with MagSpeed scrolling.' },
    { id: 'si-lapbag-001',       name: 'Laptop Bag 15.6" Waterproof with USB Port',   category_id: 'cat-lapac-001',  brand_id: 'sb-lapgen-001',   model_id: null,             price: 4999, sale_price: 3999, stock: 25, visible: true, featured: false, condition: 'new', description: 'Business backpack with USB charging port.' },
  ]);

  // 16. Payment settings
  await run('payment_settings', [{
    id: 'pay-settings-001',
    enable_easypaisa: true, enable_jazzcash: true,
    enable_bank_transfer: true, enable_cod: true,
    easypaisa_number: '03001234567',
    jazzcash_number:  '03001234567',
    bank_name: 'Meezan Bank',
    bank_account_name: 'Dilbar Mobiles',
    bank_account_number: '1234567890123456',
    iban: 'PK36MEZN0001234567890123',
    delivery_charges: 250, service_fees: 0,
    additional_instructions: 'Please send payment and upload a screenshot. Orders are processed within 24 hours.',
  }]);

  // 17. Admin settings
  await run('admin_settings', [
    { id: 'admin-settings-001', admin_email: 'admin@dilbarmobiles.com' }
  ]);

  // 18. Repairs
  await run('repairs', [
    { id: 'rep-001', tracking_code: 'DM-2024-001', device_make: 'Apple',   device_model: 'iPhone 14 Pro',  issue: 'Screen cracked',            status: 'in_progress', customer_name: 'Ahmed Hassan', customer_phone: '03001234567', estimated_cost: 14500 },
    { id: 'rep-002', tracking_code: 'DM-2024-002', device_make: 'Samsung', device_model: 'Galaxy S23',     issue: 'Battery draining too fast', status: 'pending',     customer_name: 'Sara Malik',   customer_phone: '03011234567', estimated_cost: 3200 },
    { id: 'rep-003', tracking_code: 'DM-2024-003', device_make: 'Apple',   device_model: 'iPhone 13',      issue: 'Charging port not working', status: 'completed',   customer_name: 'Bilal Ahmed',  customer_phone: '03021234567', estimated_cost: 2500, final_cost: 2500 },
    { id: 'rep-004', tracking_code: 'DM-2024-004', device_make: 'Xiaomi',  device_model: 'Redmi Note 12',  issue: 'Back camera blurry',        status: 'pending',     customer_name: 'Fatima Khan',  customer_phone: '03031234567', estimated_cost: 4500 },
    { id: 'rep-005', tracking_code: 'DM-2024-005', device_make: 'Samsung', device_model: 'Galaxy A55',     issue: 'Phone not turning on',      status: 'in_progress', customer_name: 'Usman Ali',    customer_phone: '03041234567', estimated_cost: 8000 },
  ]);

  // 19. Orders
  await run('orders', [
    { id: 'ord-001', customer_name: 'Ahmed Hassan', customer_phone: '03001234567', customer_email: 'ahmed@email.com', delivery_address: 'House 12, G-9/4, Islamabad',     total_amount: 399999, status: 'confirmed',  payment_method: 'easypaisa',     payment_status: 'approved' },
    { id: 'ord-002', customer_name: 'Sara Malik',   customer_phone: '03011234567', customer_email: 'sara@email.com',  delivery_address: 'Flat 3B, Gulshan-e-Iqbal, Karachi',total_amount: 84999,  status: 'processing', payment_method: 'jazzcash',      payment_status: 'approved' },
    { id: 'ord-003', customer_name: 'Bilal Ahmed',  customer_phone: '03021234567', customer_email: 'bilal@email.com', delivery_address: 'Plot 45, Phase 6, DHA Lahore',    total_amount: 2999,   status: 'delivered',  payment_method: 'cod',           payment_status: 'approved' },
    { id: 'ord-004', customer_name: 'Fatima Khan',  customer_phone: '03031234567', customer_email: 'fatima@email.com',delivery_address: 'House 7, Sector F-7, Islamabad',  total_amount: 329999, status: 'pending',    payment_method: 'bank_transfer', payment_status: 'pending' },
    { id: 'ord-005', customer_name: 'Usman Ali',    customer_phone: '03041234567', customer_email: 'usman@email.com', delivery_address: 'Shop 12, Tariq Road, Karachi',    total_amount: 14999,  status: 'cancelled',  payment_method: 'easypaisa',     payment_status: 'refunded' },
  ]);

  // 20. Order items
  await run('order_items', [
    { id: 'oi-001', order_id: 'ord-001', product_id: 'prod-ip15pro-001', product_name: 'iPhone 15 Pro 256GB',        product_price: 389999, quantity: 1, subtotal: 389999, item_type: 'product' },
    { id: 'oi-002', order_id: 'ord-001', product_id: 'prod-spigen-001',  product_name: 'Spigen Tough Armor Case',    product_price: 4999,   quantity: 2, subtotal: 9998,   item_type: 'product' },
    { id: 'oi-003', order_id: 'ord-002', product_id: 'prod-a55-001',     product_name: 'Samsung Galaxy A55 5G',     product_price: 79999,  quantity: 1, subtotal: 79999,  item_type: 'product' },
    { id: 'oi-004', order_id: 'ord-003', product_id: 'prod-anker-001',   product_name: 'Anker 20W USB-C Charger',   product_price: 2999,   quantity: 1, subtotal: 2999,   item_type: 'product' },
    { id: 'oi-005', order_id: 'ord-004', product_id: 'prod-dell-001',    product_name: 'Dell XPS 15 i7',           product_price: 309999, quantity: 1, subtotal: 309999, item_type: 'product' },
    { id: 'oi-006', order_id: 'ord-005', product_id: null,               product_name: 'iPhone 14 Pro Screen',     product_price: 14999,  quantity: 1, subtotal: 14999,  item_type: 'spare_part' },
  ]);

  // 21. Payments
  await run('payments', [
    { id: 'pay-001', order_id: 'ord-001', transaction_id: 'EP20241501', sender_number: '03001234567', amount: 399999, payment_method: 'easypaisa',     status: 'approved' },
    { id: 'pay-002', order_id: 'ord-002', transaction_id: 'JZ20241502', sender_number: '03011234567', amount: 84999,  payment_method: 'jazzcash',      status: 'approved' },
    { id: 'pay-003', order_id: 'ord-003', transaction_id: 'COD2024003', sender_number: '03021234567', amount: 2999,   payment_method: 'cod',           status: 'approved' },
    { id: 'pay-004', order_id: 'ord-004', transaction_id: 'BT20241504', sender_number: '03031234567', amount: 329999, payment_method: 'bank_transfer', status: 'pending' },
    { id: 'pay-005', order_id: 'ord-005', transaction_id: 'EP20241505', sender_number: '03041234567', amount: 14999,  payment_method: 'easypaisa',     status: 'refunded' },
  ]);

  // 22. Part requests
  await run('part_requests', [
    { id: 'pr-001', name: 'Kamran Akhtar', email: 'kamran@email.com', phone: '03051234567', category: 'Apple',   part_name: 'iPhone 15 Pro Max Screen', status: 'pending' },
    { id: 'pr-002', name: 'Ayesha Noor',   email: 'ayesha@email.com', phone: '03061234567', category: 'Samsung', part_name: 'S24 Ultra Back Glass',     status: 'contacted' },
    { id: 'pr-003', name: 'Zara Hussain',  email: 'zara@email.com',   phone: '03071234567', category: 'Xiaomi',  part_name: 'Redmi Note 13 Pro Battery',status: 'fulfilled' },
  ]);

  // ── Summary ──────────────────────────────────────────────────────────────
  log('\n─────────────────────────────────────────────────', 'bold');
  log(`  Done: ${ok} tables seeded, ${fail} failed`, fail > 0 ? 'yellow' : 'green');
  log('─────────────────────────────────────────────────\n', 'bold');

  if (fail > 0) {
    log('Some tables failed. This is usually due to Row Level Security (RLS).', 'yellow');
    log('To seed those tables, use the Supabase SQL Editor:', 'yellow');
    log('  https://supabase.com/dashboard/project/ekqgsyzxkkrlgzhavnoy/sql', 'blue');
    log('  Paste the contents of seed.sql and click Run.\n', 'blue');
  }

  // ── Verification ─────────────────────────────────────────────────────────
  log('Verifying row counts:', 'bold');
  const tables = ['shop_categories','products','shop_items','spare_parts',
                  'orders','repairs','payment_settings','part_categories'];
  for (const t of tables) {
    const result = await check(t);
    log(`  ${t.padEnd(22)} ${result}`);
  }
  log('');
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
