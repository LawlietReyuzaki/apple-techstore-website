/**
 * Catalog routes — category pages, JSON API for the React pages, category sitemap,
 * and admin rebuild. Everything reads the catalog_* tables; existing product /
 * spare-part routes and URLs are untouched.
 */
import { rebuildCatalog, scheduleCatalogRebuild, bandLabel } from './rebuild.js';
import { partPlural, PRICE_BANDS } from './classify.js';
import { categoryMeta } from '../botRenderer.js';

const SITE = 'https://appletechstore.pk';
const PAGE_SIZE = 48;
const CACHE_TTL = 5 * 60 * 1000;
const SORTS = {
  default: 'in_stock DESC, (image_count > 0) DESC, name ASC, source_table ASC',
  'price-asc': 'price ASC NULLS LAST, name ASC',
  'price-desc': 'price DESC NULLS LAST, name ASC',
  name: 'name ASC',
};
const ITEM_FIELDS = `item_id, source_table, name, kind, brand, brand_slug, model, model_slug, part_type, part_type_slug,
  price, regular_price, price_band_slug, stock, in_stock, url_path, main_image, image_count`;
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

// ── Small TTL cache (cleared after every rebuild) ─────────────────────────
const cache = new Map();
async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return v;
}
export const clearCatalogCache = () => cache.clear();

// ── Data access ───────────────────────────────────────────────────────────
export async function getCategory(pool, path) {
  return cached(`cat:${path}`, async () =>
    (await pool.query('SELECT * FROM catalog_categories WHERE path = $1', [path])).rows[0] || null);
}

function baseFilter(cat) {
  switch (cat.type) {
    case 'brand': return { where: ['brand_slug = $1'], params: [cat.brand_slug] };
    case 'model': return { where: ['brand_slug = $1', 'model_slug = $2'], params: [cat.brand_slug, cat.model_slug] };
    case 'part': return { where: ['part_type_slug = $1'], params: [cat.part_type_slug] };
    case 'part_brand': return { where: ['part_type_slug = $1', 'brand_slug = $2'], params: [cat.part_type_slug, cat.brand_slug] };
    case 'phones_price': return { where: [`kind = 'Phone'`, 'price_band_slug = $1'], params: [cat.price_band_slug] };
    default: return null;   // index pages list categories, not items
  }
}

export async function getItems(pool, cat, { part, brand, price, sort, offset = 0, limit = PAGE_SIZE } = {}) {
  const f = baseFilter(cat);
  if (!f) return { items: [], total: 0 };
  const where = [...f.where], params = [...f.params];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (part && SLUG_RE.test(part)) add('part_type_slug = ?', part);
  if (brand && SLUG_RE.test(brand)) add('brand_slug = ?', brand);
  if (price && SLUG_RE.test(price)) add('price_band_slug = ?', price);
  const order = SORTS[sort] || SORTS.default;
  const lim = Math.min(Math.max(parseInt(limit) || PAGE_SIZE, 1), 96);
  const off = Math.max(parseInt(offset) || 0, 0);
  const key = `items:${cat.path}:${part}:${brand}:${price}:${sort}:${off}:${lim}`;
  return cached(key, async () => {
    const w = where.join(' AND ');
    const [{ rows: items }, { rows: [{ n }] }] = await Promise.all([
      pool.query(`SELECT ${ITEM_FIELDS} FROM catalog_items WHERE ${w} ORDER BY ${order} LIMIT ${lim} OFFSET ${off}`, params),
      pool.query(`SELECT COUNT(*)::int AS n FROM catalog_items WHERE ${w}`, params),
    ]);
    return { items, total: n };
  });
}

// Filter options shown on an item page (counts reflect the page's base filter)
export async function getFacets(pool, cat) {
  const f = baseFilter(cat);
  if (!f) return { parts: [], brands: [], prices: [] };
  return cached(`facets:${cat.path}`, async () => {
    const w = f.where.join(' AND ');
    const [parts, brands, prices] = await Promise.all([
      cat.type === 'brand' || cat.type === 'model'
        ? pool.query(`SELECT part_type_slug AS slug, part_type AS name, COUNT(*)::int AS count FROM catalog_items
                      WHERE ${w} AND part_type_slug <> '' GROUP BY 1,2 ORDER BY count DESC`, f.params)
        : { rows: [] },
      cat.type === 'part' || cat.type === 'phones_price'
        ? pool.query(`SELECT brand_slug AS slug, brand AS name, COUNT(*)::int AS count FROM catalog_items
                      WHERE ${w} GROUP BY 1,2 ORDER BY count DESC`, f.params)
        : { rows: [] },
      cat.type === 'phones_price'
        ? { rows: [] }
        : pool.query(`SELECT price_band_slug AS slug, COUNT(*)::int AS count FROM catalog_items
                      WHERE ${w} AND price_band_slug <> 'no-price' GROUP BY 1`, f.params),
    ]);
    const order = PRICE_BANDS.map((b) => b[3]);
    return {
      parts: parts.rows.map((p) => ({ ...p, name: partPlural(p.name) })),
      brands: brands.rows,
      prices: prices.rows.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
        .map((p) => ({ ...p, name: bandLabel(p.slug) })),
    };
  });
}

// Links to deeper / sibling category pages
export async function getLinks(pool, cat) {
  return cached(`links:${cat.path}`, async () => {
    const q = (sql, p = []) => pool.query(sql, p).then((r) => r.rows);
    switch (cat.type) {
      case 'brand_index':
        return q(`SELECT path, brand AS name, unique_count AS count, NULL AS grp FROM catalog_categories
                  WHERE type = 'brand' ORDER BY sort_order`);
      case 'brand': {
        const models = await q(`SELECT path, model AS name, unique_count AS count, series AS grp FROM catalog_categories
                                WHERE type = 'model' AND brand_slug = $1 ORDER BY series, model`, [cat.brand_slug]);
        const parts = await q(`SELECT path, part_type AS name, unique_count AS count, 'Parts' AS grp FROM catalog_categories
                               WHERE type = 'part_brand' AND brand_slug = $1 ORDER BY sort_order`, [cat.brand_slug]);
        return [...parts.map((p) => ({ ...p, name: `${cat.brand} ${partPlural(p.name)}` })), ...models];
      }
      case 'model':
        return q(`SELECT '/parts/' || part_type_slug || '/' || brand_slug AS path, part_type AS name,
                         COUNT(DISTINCT lower(name))::int AS count, 'Parts' AS grp
                    FROM catalog_items WHERE brand_slug = $1 AND model_slug = $2 AND part_type_slug <> ''
                   GROUP BY part_type_slug, brand_slug, part_type ORDER BY count DESC`, [cat.brand_slug, cat.model_slug])
          .then((rows) => rows.map((r) => ({ ...r, name: `All ${cat.brand} ${partPlural(r.name)}` })));
      case 'part_index':
        return q(`SELECT path, part_type AS name, unique_count AS count, part_group AS grp FROM catalog_categories
                  WHERE type = 'part' ORDER BY part_group, sort_order`)
          .then((rows) => rows.map((r) => ({ ...r, name: partPlural(r.name) })));
      case 'part':
        return q(`SELECT path, brand AS name, unique_count AS count, NULL AS grp FROM catalog_categories
                  WHERE type = 'part_brand' AND part_type_slug = $1 ORDER BY sort_order`, [cat.part_type_slug])
          .then((rows) => rows.map((r) => ({ ...r, name: `${r.name} ${partPlural(cat.part_type)}` })));
      case 'part_brand':
        return q(`SELECT '/brands/' || brand_slug || '/' || model_slug AS path, MIN(model) AS name,
                         COUNT(DISTINCT lower(name))::int AS count, NULL AS grp
                    FROM catalog_items WHERE part_type_slug = $1 AND brand_slug = $2 AND model_slug <> ''
                   GROUP BY brand_slug, model_slug ORDER BY name`, [cat.part_type_slug, cat.brand_slug]);
      case 'phones_price':
        return q(`SELECT path, heading AS name, unique_count AS count, NULL AS grp FROM catalog_categories
                  WHERE type = 'phones_price' ORDER BY sort_order`);
      default:
        return [];
    }
  });
}

export function breadcrumbsFor(cat) {
  const c = [{ name: 'Home', url: '/' }];
  const brands = { name: 'Brands', url: '/brands' }, parts = { name: 'Parts', url: '/parts' };
  switch (cat.type) {
    case 'brand_index': c.push(brands); break;
    case 'brand': c.push(brands, { name: cat.brand, url: cat.path }); break;
    case 'model': c.push(brands, { name: cat.brand, url: `/brands/${cat.brand_slug}` }, { name: cat.model, url: cat.path }); break;
    case 'part_index': c.push(parts); break;
    case 'part': c.push(parts, { name: partPlural(cat.part_type), url: cat.path }); break;
    case 'part_brand':
      c.push(parts, { name: partPlural(cat.part_type), url: `/parts/${cat.part_type_slug}` }, { name: cat.brand, url: cat.path });
      break;
    case 'phones_price': c.push({ name: 'Phones', url: '/phones' }, { name: bandLabel(cat.price_band_slug), url: cat.path }); break;
    default: break;
  }
  return c;
}

// ── Registration ──────────────────────────────────────────────────────────
export function registerCatalogRoutes(app, { pool, sendPage, sendNotFound, verifyToken }) {
  const rebuildNow = async () => { const s = await rebuildCatalog(pool, console.log); clearCatalogCache(); return s; };
  const scheduleRebuild = (delay) => scheduleCatalogRebuild(pool, delay, clearCatalogCache);

  // JSON for the React category pages
  app.get('/api/catalog/page', async (req, res) => {
    try {
      const path = normalizePath(String(req.query.path || ''));
      const cat = await getCategory(pool, path);
      if (!cat) return res.status(404).json({ error: 'Category not found' });
      const [{ items, total }, links, facets] = await Promise.all([
        getItems(pool, cat, req.query), getLinks(pool, cat), getFacets(pool, cat),
      ]);
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ category: cat, breadcrumbs: breadcrumbsFor(cat), links, facets, items, total, pageSize: PAGE_SIZE });
    } catch (err) {
      console.error('[catalog/page]', err.message);
      res.status(503).json({ error: 'Catalog temporarily unavailable' });
    }
  });

  // Menu data: brands, part types and phone price ranges (for navigation / finder)
  app.get('/api/catalog/menu', async (req, res) => {
    try {
      const data = await cached('menu', async () => {
        const { rows } = await pool.query(
          `SELECT path, type, brand, brand_slug, part_type, part_type_slug, part_group, price_band_slug, heading, unique_count
             FROM catalog_categories WHERE type IN ('brand','part','phones_price') ORDER BY type, sort_order`);
        return {
          brands: rows.filter((r) => r.type === 'brand').map((r) => ({ name: r.brand, slug: r.brand_slug, path: r.path, count: r.unique_count })),
          parts: rows.filter((r) => r.type === 'part').map((r) => ({ name: partPlural(r.part_type), slug: r.part_type_slug, group: r.part_group, path: r.path, count: r.unique_count })),
          phonePrices: rows.filter((r) => r.type === 'phones_price').map((r) => ({ name: bandLabel(r.price_band_slug), slug: r.price_band_slug, path: r.path, count: r.unique_count })),
        };
      });
      res.set('Cache-Control', 'public, max-age=300');
      res.json(data);
    } catch (err) {
      console.error('[catalog/menu]', err.message);
      res.status(503).json({ error: 'Catalog temporarily unavailable' });
    }
  });

  // Brand → model list for the spare-part finder
  app.get('/api/catalog/models', async (req, res) => {
    const brand = String(req.query.brand || '');
    if (!SLUG_RE.test(brand)) return res.status(400).json({ error: 'brand required' });
    try {
      const rows = await cached(`models:${brand}`, async () => (await pool.query(
        `SELECT model_slug AS slug, model AS name, series, unique_count AS count, path FROM catalog_categories
          WHERE type = 'model' AND brand_slug = $1 ORDER BY series, model`, [brand])).rows);
      res.json({ models: rows });
    } catch (err) {
      res.status(503).json({ error: 'Catalog temporarily unavailable' });
    }
  });

  // Classification of one item (breadcrumbs on product pages)
  app.get('/api/catalog/item', async (req, res) => {
    const id = String(req.query.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'id required' });
    try {
      const row = await cached(`item:${id}`, async () => (await pool.query(
        `SELECT brand, brand_slug, series, model, model_slug, part_type, part_type_slug, kind
           FROM catalog_items WHERE item_id = $1 LIMIT 1`, [id])).rows[0] || null);
      if (!row) return res.status(404).json({ error: 'not found' });
      res.json({ ...row, part_plural: row.part_type ? partPlural(row.part_type) : null });
    } catch (err) {
      res.status(503).json({ error: 'Catalog temporarily unavailable' });
    }
  });

  // Rebuild on demand (admin)
  app.post('/api/admin/catalog/rebuild', async (req, res) => {
    const user = verifyToken?.(req);
    if (!user?.sub) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { rows } = await pool.query(`SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin'`, [user.sub]);
      if (!rows.length) return res.status(403).json({ error: 'Admin only' });
      res.json(await rebuildNow());
    }
    catch (err) { console.error('[catalog] rebuild failed:', err.message); res.status(500).json({ error: err.message }); }
  });

  // Category sitemap — only pages with 2+ distinct products
  app.get('/sitemap-categories.xml', async (req, res) => {
    let rows = [];
    try {
      ({ rows } = await pool.query(
        `SELECT path, updated_at FROM catalog_categories WHERE indexable ORDER BY type, sort_order, path`));
    } catch (err) { console.error('[sitemap-categories]', err.message); }
    const today = new Date().toISOString().split('T')[0];
    const urls = rows.map((r) => {
      const lastmod = r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : today;
      return `  <url><loc>${SITE}${r.path}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    }).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  });

  // The category pages themselves — server-rendered meta for every visitor
  const PAGE_ROUTES = ['/brands', '/brands/:brand', '/brands/:brand/:model', '/parts', '/parts/:part',
    '/parts/:part/:brand', '/phones/price/:band'];
  app.get(PAGE_ROUTES, async (req, res, next) => {
    const path = normalizePath(req.path);
    if (path !== req.path) {                       // /Brands/Samsung/ → /brands/samsung
      const q = req.originalUrl.indexOf('?');
      return res.redirect(301, path + (q >= 0 ? req.originalUrl.slice(q) : ''));
    }
    let cat, items = [], links = [];
    try {
      cat = await getCategory(pool, path);
      if (cat) [{ items }, links] = await Promise.all([getItems(pool, cat, {}), getLinks(pool, cat)]);
    } catch (err) {
      console.error('[catalog page]', err.message);
      return next();                              // DB trouble: serve the normal app, never a false 404
    }
    if (!cat) return sendNotFound(req, res);
    sendPage(req, res, categoryMeta(cat, items, links.map((l) => ({ name: l.name, path: l.path, count: l.count })),
      breadcrumbsFor(cat)));
  });

  return { rebuildNow, scheduleRebuild };
}

export function normalizePath(p) {
  const s = String(p || '').toLowerCase().replace(/\/{2,}/g, '/');
  return s.length > 1 ? s.replace(/\/+$/, '') : s;
}
