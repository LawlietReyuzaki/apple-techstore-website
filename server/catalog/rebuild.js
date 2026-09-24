/**
 * Rebuilds the catalog layer (catalog_items + catalog_categories) from the source tables.
 * Read-only on products / spare_parts / shop_items; writes only the two catalog tables,
 * inside one transaction, serialized by an advisory lock so concurrent rebuilds are safe.
 *
 * CLI:   node server/catalog/rebuild.js
 * Code:  import { rebuildCatalog } from './catalog/rebuild.js'; await rebuildCatalog(pool)
 */
import { classifyItem, partPlural, PRICE_BANDS } from './classify.js';

const LOCK_KEY = 70421;          // arbitrary constant for pg_advisory_xact_lock
const SITE_NAME = 'AppleTechStore';

export const TABLES_SQL = `
CREATE TABLE IF NOT EXISTS catalog_items (
  item_id UUID NOT NULL, source_table TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
  brand TEXT NOT NULL, brand_slug TEXT NOT NULL, series TEXT, series_slug TEXT, model TEXT, model_slug TEXT,
  part_group TEXT, part_type TEXT, part_type_slug TEXT, quality TEXT, display_tech TEXT, pta_status TEXT,
  condition TEXT, price NUMERIC, regular_price NUMERIC, price_band TEXT, price_band_slug TEXT, stock INTEGER,
  in_stock BOOLEAN, url_path TEXT NOT NULL, old_url_path TEXT, main_image TEXT, images TEXT[], image_count INTEGER,
  bucket_folder TEXT, needs_review TEXT, updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (source_table, item_id));
CREATE INDEX IF NOT EXISTS idx_catalog_items_brand       ON catalog_items (brand_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_brand_model ON catalog_items (brand_slug, model_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_part        ON catalog_items (part_type_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_part_brand  ON catalog_items (part_type_slug, brand_slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_kind_price  ON catalog_items (kind, price_band_slug);
CREATE TABLE IF NOT EXISTS catalog_categories (
  path TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, heading TEXT NOT NULL, description TEXT NOT NULL,
  brand TEXT, brand_slug TEXT, series TEXT, model TEXT, model_slug TEXT, part_group TEXT, part_type TEXT,
  part_type_slug TEXT, price_band TEXT, price_band_slug TEXT, parent_path TEXT, item_count INTEGER NOT NULL DEFAULT 0,
  unique_count INTEGER NOT NULL DEFAULT 0, min_price NUMERIC, max_price NUMERIC, indexable BOOLEAN NOT NULL DEFAULT false, sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_catalog_categories_type   ON catalog_categories (type);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_parent ON catalog_categories (parent_path);
`;

const ITEM_COLS = ['item_id', 'source_table', 'name', 'kind', 'brand', 'brand_slug', 'series', 'series_slug', 'model',
  'model_slug', 'part_group', 'part_type', 'part_type_slug', 'quality', 'display_tech', 'pta_status', 'condition',
  'price', 'regular_price', 'price_band', 'price_band_slug', 'stock', 'in_stock', 'url_path', 'old_url_path',
  'main_image', 'images', 'image_count', 'bucket_folder', 'needs_review'];
const CAT_COLS = ['path', 'type', 'title', 'heading', 'description', 'brand', 'brand_slug', 'series', 'model',
  'model_slug', 'part_group', 'part_type', 'part_type_slug', 'price_band', 'price_band_slug', 'parent_path',
  'item_count', 'unique_count', 'min_price', 'max_price', 'indexable', 'sort_order'];

// ── Load + classify ───────────────────────────────────────────────────────
export async function loadAndClassify(db) {
  const { rows: products } = await db.query(
    `SELECT p.id, p.name, p.brand, p.price, p.wholesale_price, p.sale_price, p.stock, p.slug, p.images,
            c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id`);
  const { rows: parts } = await db.query(
    `SELECT s.id, s.name, s.price, s.sale_price, s.stock, s.slug, s.images, s.visible,
            pc.name AS part_category, b.name AS model_brand, q.name AS quality_name
       FROM spare_parts s
       LEFT JOIN part_categories pc   ON pc.id = s.part_category_id
       LEFT JOIN phone_models pm      ON pm.id = s.phone_model_id
       LEFT JOIN spare_parts_brands b ON b.id  = pm.brand_id
       LEFT JOIN part_qualities q     ON q.id  = s.quality_id`);
  let shop = [];
  try { ({ rows: shop } = await db.query('SELECT * FROM shop_items')); } catch { /* optional table */ }

  const items = [];
  for (const r of products) items.push(classifyItem('products', r, r.category_name, r.brand));
  for (const r of parts) {
    if (r.visible === false) continue;           // hidden parts are not shown on the site
    items.push(classifyItem('spare_parts', r, r.part_category, r.model_brand, r.quality_name));
  }
  for (const r of shop) {
    if (r.visible === false) continue;
    items.push(classifyItem('shop_items', r, 'Shop Item', null));
  }
  return items;
}

// ── Category pages ────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const trim160 = (s) => {
  const c = String(s).replace(/\s+/g, ' ').trim();
  return c.length <= 160 ? c : c.slice(0, 157).replace(/\s+\S*$/, '') + '…';
};
function groupBy(list, keyFn) {
  const m = new Map();
  for (const i of list) {
    const k = keyFn(i);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(i);
  }
  return m;
}
// item_count = every listing (duplicates across tables included — all are shown on the page)
// unique_count = distinct product names — used for honest counts in text and for indexability
function priceStats(list) {
  let min = null, max = null;
  for (const i of list) {
    if (!(i.price > 0)) continue;
    if (min === null || i.price < min) min = i.price;
    if (max === null || i.price > max) max = i.price;
  }
  const unique = new Set(list.map((i) => i.name.trim().toLowerCase())).size;
  return { item_count: list.length, unique_count: unique, min_price: min, max_price: max };
}
// most common value; ties → alphabetically first (stable, deterministic)
function mode(list, f) {
  const c = new Map();
  for (const i of list) { const v = i[f]; if (v) c.set(v, (c.get(v) || 0) + 1); }
  return [...c.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || '';
}
function topParts(list, n = 3) {
  const c = new Map();
  for (const i of list) if (i.part_type) c.set(i.part_type, (c.get(i.part_type) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([p]) => partPlural(p));
}
const fromPrice = (s) => (s.min_price ? ` from Rs. ${fmt(s.min_price)}` : '');
const bandLabel = (slug) => {
  const b = PRICE_BANDS.find((x) => x[3] === slug);
  if (!b) return slug;
  if (b[0] === 0) return `Under Rs ${fmt(b[1] + 1)}`;
  if (b[1] >= 1e12) return `Rs ${fmt(b[0])} and Above`;
  return `Rs ${fmt(b[0])} to ${fmt(b[1])}`;
};
export { bandLabel };

export function buildCategories(items) {
  const out = [];
  const isPart = (i) => !!i.part_type;
  const isPhone = (i) => i.kind === 'Phone' || i.kind === 'Tablet';
  const base = { brand: null, brand_slug: null, series: null, model: null, model_slug: null, part_group: null,
    part_type: null, part_type_slug: null, price_band: null, price_band_slug: null, parent_path: null };
  // A page only goes to Google when it lists 2+ DIFFERENT products (not one product listed twice)
  const push = (row) => out.push({ ...base, ...row, indexable: row.unique_count >= 2 });

  // /brands and /brands/:brand
  const byBrand = groupBy(items, (i) => i.brand_slug);
  push({ path: '/brands', type: 'brand_index', title: `Shop by Brand — Phones & Spare Parts | ${SITE_NAME}`,
    heading: 'Shop by Brand', description: trim160(`Phones, spare parts and accessories from ${byBrand.size} brands — ` +
      `Samsung, Xiaomi, Motorola, Huawei, Oppo, Infinix and more. Cash on Delivery across Pakistan.`),
    ...priceStats(items), sort_order: 0 });
  let order = 0;
  for (const [slug, list] of [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const brand = list[0].brand;
    const hasParts = list.some(isPart), hasPhones = list.some(isPhone);
    const what = hasParts && hasPhones ? 'Phones & Spare Parts' : hasParts ? 'Spare Parts' : 'Phones';
    const s = priceStats(list);
    const tp = topParts(list);
    push({ path: `/brands/${slug}`, type: 'brand', brand, brand_slug: slug, parent_path: '/brands',
      title: `${brand} ${what} Price in Pakistan | ${SITE_NAME}`, heading: `${brand} ${what}`,
      description: trim160(`Buy ${brand} ${what.toLowerCase()} in Pakistan — ${fmt(s.unique_count)} products${fromPrice(s)}` +
        `${tp.length ? `: ${tp.join(', ')}` : ''}. Cash on Delivery nationwide.`),
      ...s, sort_order: order++ });

    // /brands/:brand/:model
    const byModel = groupBy(list, (i) => i.model_slug);
    for (const [mslug, mlist] of byModel) {
      const model = mode(mlist, 'model'), series = mode(mlist, 'series');
      const ms = priceStats(mlist);
      const mparts = mlist.some(isPart);
      const mtp = topParts(mlist, 4);
      push({ path: `/brands/${slug}/${mslug}`, type: 'model', brand, brand_slug: slug, series, model, model_slug: mslug,
        parent_path: `/brands/${slug}`,
        title: mparts ? `${model} Spare Parts Price in Pakistan | ${SITE_NAME}` : `${model} Price in Pakistan | ${SITE_NAME}`,
        heading: mparts ? `${model} Spare Parts` : model,
        description: trim160(mparts
          ? `${fmt(ms.unique_count)} part${ms.unique_count === 1 ? '' : 's'} for ${model}${mtp.length ? `: ${mtp.join(', ')}` : ''}${fromPrice(ms)}. ` +
            `Quality tested, Cash on Delivery across Pakistan.`
          : `Buy ${model} in Pakistan${fromPrice(ms)}. Cash on Delivery, JazzCash & Easypaisa. Delivery nationwide.`),
        ...ms, sort_order: 0 });
    }
  }

  // /parts, /parts/:part, /parts/:part/:brand
  const partItems = items.filter(isPart);
  const byPart = groupBy(partItems, (i) => i.part_type_slug);
  push({ path: '/parts', type: 'part_index', title: `Mobile & Laptop Spare Parts by Type | ${SITE_NAME}`,
    heading: 'Shop by Part', description: trim160(`LCD panels, batteries, touch glass, charging ports, SIM trays and ` +
      `${byPart.size - 5}+ more part types for every major brand. Cash on Delivery across Pakistan.`),
    ...priceStats(partItems), sort_order: 0 });
  order = 0;
  for (const [pslug, list] of [...byPart.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const pt = list[0].part_type, plural = partPlural(pt);
    const s = priceStats(list);
    const bb = groupBy(list, (i) => i.brand_slug);
    push({ path: `/parts/${pslug}`, type: 'part', part_group: list[0].part_group, part_type: pt, part_type_slug: pslug,
      parent_path: '/parts', title: `${plural} Price in Pakistan — All Brands | ${SITE_NAME}`, heading: plural,
      description: trim160(`Buy ${plural} for ${bb.size} brands in Pakistan — ${fmt(s.unique_count)} products${fromPrice(s)}. ` +
        `Quality tested, Cash on Delivery nationwide.`),
      ...s, sort_order: order++ });
    let bo = 0;
    for (const [bslug, blist] of [...bb.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const brand = blist[0].brand;
      const bs = priceStats(blist);
      const models = new Set(blist.map((i) => i.model_slug).filter(Boolean)).size;
      push({ path: `/parts/${pslug}/${bslug}`, type: 'part_brand', brand, brand_slug: bslug, part_group: blist[0].part_group,
        part_type: pt, part_type_slug: pslug, parent_path: `/parts/${pslug}`,
        title: `${brand} ${plural} Price in Pakistan | ${SITE_NAME}`, heading: `${brand} ${plural}`,
        description: trim160(`${fmt(bs.unique_count)} ${brand} ${plural}${fromPrice(bs)} — for ${models} ${brand} ` +
          `model${models === 1 ? '' : 's'}. Cash on Delivery across Pakistan.`),
        ...bs, sort_order: bo++ });
    }
  }

  // /phones/price/:band
  const phones = items.filter((i) => i.kind === 'Phone');
  const byBand = groupBy(phones, (i) => (i.price_band_slug !== 'no-price' ? i.price_band_slug : null));
  for (const [, , , bslug] of PRICE_BANDS) {
    const list = byBand.get(bslug);
    if (!list) continue;
    const label = bandLabel(bslug);
    const s = priceStats(list);
    const brands = [...groupBy(list, (i) => i.brand).entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 4).map(([b]) => b);
    push({ path: `/phones/price/${bslug}`, type: 'phones_price', price_band: list[0].price_band, price_band_slug: bslug,
      parent_path: '/phones', title: `Mobile Phones ${label} in Pakistan | ${SITE_NAME}`, heading: `Mobile Phones ${label}`,
      description: trim160(`${fmt(s.unique_count)} phones priced ${label.toLowerCase().replace('rs', 'Rs')} in Pakistan` +
        `${brands.length ? ` — ${brands.join(', ')} and more` : ''}. Cash on Delivery nationwide.`),
      ...s, sort_order: PRICE_BANDS.findIndex((b) => b[3] === bslug) });
  }
  return out;
}

// ── Write ─────────────────────────────────────────────────────────────────
async function insertBatches(client, table, cols, rows, batch = 400) {
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const params = [];
    const values = chunk.map((r) => '(' + cols.map((c) => { params.push(r[c] ?? null); return `$${params.length}`; }).join(',') + ')');
    await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values.join(',')}`, params);
  }
}

export async function rebuildCatalog(pool, log = () => {}) {
  const t0 = Date.now();
  const items = await loadAndClassify(pool);
  const cats = buildCategories(items);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
    await client.query(TABLES_SQL);
    await client.query('DELETE FROM catalog_items');
    await insertBatches(client, 'catalog_items', ITEM_COLS, items);
    await client.query('DELETE FROM catalog_categories');
    await insertBatches(client, 'catalog_categories', CAT_COLS, cats);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  const stats = {
    items: items.length,
    categories: cats.length,
    indexable: cats.filter((c) => c.indexable).length,
    byType: cats.reduce((m, c) => ((m[c.type] = (m[c.type] || 0) + 1), m), {}),
    ms: Date.now() - t0,
  };
  log(`[catalog] rebuilt: ${stats.items} items, ${stats.categories} categories (${stats.indexable} indexable) in ${stats.ms} ms`);
  return stats;
}

// ── Debounced background rebuild (after products/spare parts change) ─────
let timer = null, running = false, again = false;
export function scheduleCatalogRebuild(pool, delayMs = 120000, onDone = () => {}) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    if (running) { again = true; return; }
    running = true;
    try { await rebuildCatalog(pool, console.log); onDone(); }
    catch (e) { console.error('[catalog] rebuild failed:', e.message); }
    finally {
      running = false;
      if (again) { again = false; scheduleCatalogRebuild(pool, 5000, onDone); }
    }
  }, delayMs);
}

// ── CLI ───────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/catalog/rebuild.js')) {
  const { default: pool } = await import('../db.js');
  try {
    const s = await rebuildCatalog(pool, console.log);
    console.log(JSON.stringify(s, null, 2));
  } catch (e) {
    console.error('REBUILD FAILED (rolled back):', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
