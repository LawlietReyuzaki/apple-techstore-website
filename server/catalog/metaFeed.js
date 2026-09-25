/**
 * Meta (Facebook / Instagram) Commerce catalog feed, generated from the catalog layer.
 *
 * Served at /meta-feed.csv (full), /meta-feed-test.csv (first 20) and /meta-feed-skipped.csv,
 * with a JSON report at /api/meta-feed/report. Regenerated after every catalog rebuild and at
 * least once a day, so Commerce Manager's scheduled fetch always gets current stock and prices.
 */
const SITE = 'https://appletechstore.pk';
const REFRESH_MS = 24 * 60 * 60 * 1000;
const TEST_ROWS = 20;
const MAX_EXTRA_IMAGES = 20;

const COLUMNS = ['id', 'title', 'description', 'availability', 'condition', 'price', 'sale_price', 'link',
  'image_link', 'additional_image_link', 'brand', 'product_type', 'google_product_category',
  'custom_label_0', 'custom_label_1'];

const GPC = {
  phone: 'Electronics > Communications > Telephony > Mobile Phones',
  phoneAccessory: 'Electronics > Communications > Telephony > Mobile Phone Accessories',
  charger: 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers',
  laptop: 'Electronics > Computers > Laptops',
  laptopPart: 'Electronics > Electronics Accessories > Computer Components > Laptop Parts',
  laptopBattery: 'Electronics > Electronics Accessories > Power > Batteries > Laptop Batteries',
  screenProtector: 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Screen Protectors',
  phoneCase: 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases',
  computerAccessory: 'Electronics > Electronics Accessories > Computer Accessories',
};

// ── Field helpers ─────────────────────────────────────────────────────────
const stripHtml = (s) => String(s || '')
  .replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const isHttps = (u) => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim());
const money = (n) => (n == null || !(Number(n) > 0) ? '' : `${Number(n) % 1 === 0 ? Number(n) : Number(n).toFixed(2)} PKR`);

function categoryOf(r) {
  // top-level category + subcategory the way the store groups things
  switch (r.kind) {
    case 'Phone': return ['Mobile Phones', r.brand || 'Phones'];
    case 'Laptop': return ['Laptops', r.brand || 'Laptops'];
    case 'Laptop Part': return ['Laptop & Computer Parts', r.part_type || 'Laptop Parts'];
    case 'Accessory': return ['Accessories', r.part_type || r.part_group || 'Accessories'];
    default: return ['Mobile Spare Parts', r.part_type || r.part_group || 'Spare Parts'];
  }
}

function googleCategory(r) {
  const pt = (r.part_type || '').toLowerCase();
  if (r.kind === 'Phone') return GPC.phone;
  if (r.kind === 'Laptop') return GPC.laptop;
  if (r.kind === 'Laptop Part') return /batter/.test(pt) ? GPC.laptopBattery : GPC.laptopPart;
  if (/charger|cable/.test(pt)) return GPC.charger;
  if (/protector/.test(pt)) return GPC.screenProtector;
  if (/case|cover/.test(pt) && r.kind === 'Accessory') return GPC.phoneCase;
  if (r.kind === 'Accessory' && /(keyboard|mouse|computer)/.test(pt)) return GPC.computerAccessory;
  return GPC.phoneAccessory;
}

function conditionOf(r) {
  const c = String(r.condition || '').toLowerCase();
  const n = String(r.name || '').toLowerCase();
  if (/refurb/.test(c) || /refurb/.test(n)) return 'refurbished';
  if (/\bused\b|pre-owned|preowned|second hand/.test(c) || /\bused\b|pre-owned/.test(n)) return 'used';
  return 'new';
}

function describe(r) {
  const own = stripHtml(r.description);
  if (own.length >= 20) return clip(own, 9999);
  const [cat, sub] = categoryOf(r);
  const model = r.model && r.brand ? `${r.brand} ${r.model}` : r.brand || '';
  const parts = [`${r.name}.`];
  if (r.kind === 'Phone') parts.push(`${model ? model + ' — ' : ''}${conditionOf(r) === 'new' ? 'brand new' : 'quality-checked, tested'} mobile phone at AppleTechStore, Pakistan.`);
  else parts.push(`Genuine ${sub.toLowerCase()} for ${model || 'your device'}${r.quality ? ` (${r.quality})` : ''}, from AppleTechStore — ${cat.toLowerCase()} with cash on delivery across Pakistan and same-day dispatch.`);
  if (own) parts.push(own);
  return clip(parts.join(' '), 9999);
}

// ── Build ─────────────────────────────────────────────────────────────────
export function buildFeedRows(items) {
  const rows = [], skipped = [], seen = new Set();
  for (const r of items) {
    const reasons = [];
    if (!r.item_id) reasons.push('missing id');
    const title = clip(stripHtml(r.name), 200);
    if (!title) reasons.push('missing title');
    const regular = Number(r.regular_price) > 0 ? Number(r.regular_price) : null;
    const current = Number(r.price) > 0 ? Number(r.price) : null;
    const price = regular && current && regular > current ? regular : current;
    const salePrice = regular && current && regular > current ? current : null;
    if (!price) reasons.push('missing price');
    const link = r.url_path ? `${SITE}${r.url_path}` : '';
    if (!link) reasons.push('missing link');
    const images = (Array.isArray(r.images) ? r.images : []).map((u) => String(u || '').trim()).filter(isHttps);
    const main = isHttps(r.main_image) ? r.main_image.trim() : images[0];
    if (!main) reasons.push('missing image_link (no https image)');
    // the same product can be listed in two source tables — send it to Meta once
    const key = title.toLowerCase();
    if (!reasons.length && seen.has(key)) reasons.push('duplicate of another row with the same name');
    if (reasons.length) { skipped.push({ id: r.item_id || '', title, reason: reasons.join('; ') }); continue; }
    seen.add(key);
    const [cat, sub] = categoryOf(r);
    rows.push({
      id: r.item_id,
      title,
      description: describe(r),
      availability: r.in_stock ? 'in stock' : 'out of stock',
      condition: conditionOf(r),
      price: money(price),
      sale_price: salePrice ? money(salePrice) : '',
      link,
      image_link: main,
      additional_image_link: images.filter((u) => u !== main).slice(0, MAX_EXTRA_IMAGES).join(','),
      brand: r.brand || 'AppleTechStore',
      product_type: `${cat} > ${sub}`,
      google_product_category: googleCategory(r),
      custom_label_0: cat,
      custom_label_1: sub,
    });
  }
  return { rows, skipped };
}

export const toCsv = (rows, columns = COLUMNS) =>
  '﻿' + [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';

const ITEM_SQL = `
  SELECT c.item_id, c.source_table, c.name, c.kind, c.brand, c.model, c.part_group, c.part_type, c.quality, c.condition,
         c.price, c.regular_price, c.in_stock, c.url_path, c.main_image, c.images,
         COALESCE(p.description, s.description, i.description) AS description
    FROM catalog_items c
    LEFT JOIN products p    ON c.source_table = 'products'    AND p.id = c.item_id
    LEFT JOIN spare_parts s ON c.source_table = 'spare_parts' AND s.id = c.item_id
    LEFT JOIN shop_items i  ON c.source_table = 'shop_items'  AND i.id = c.item_id
   ORDER BY c.in_stock DESC, c.image_count DESC, c.name`;

export async function buildFeed(pool) {
  const { rows: items } = await pool.query(ITEM_SQL);
  const { rows, skipped } = buildFeedRows(items);
  const report = {
    generated_at: new Date().toISOString(),
    total_rows: items.length,
    rows_in_feed: rows.length,
    rows_skipped: skipped.length,
    skipped_by_reason: skipped.reduce((m, s) => { m[s.reason] = (m[s.reason] || 0) + 1; return m; }, {}),
    in_stock: rows.filter((r) => r.availability === 'in stock').length,
    feed_url: `${SITE}/meta-feed.csv`,
    test_feed_url: `${SITE}/meta-feed-test.csv`,
    skipped_url: `${SITE}/meta-feed-skipped.csv`,
  };
  return {
    csv: toCsv(rows),
    testCsv: toCsv(rows.slice(0, TEST_ROWS)),
    skippedCsv: toCsv(skipped, ['id', 'title', 'reason']),
    report,
    builtAt: Date.now(),
  };
}

// ── Cache + routes ────────────────────────────────────────────────────────
let feed = null, building = null, stale = true;
export const markFeedStale = () => { stale = true; };

async function getFeed(pool) {
  const old = feed && Date.now() - feed.builtAt > REFRESH_MS;
  if (feed && !stale && !old) return feed;
  if (!building) building = buildFeed(pool).then((f) => { feed = f; stale = false; return f; }).finally(() => { building = null; });
  if (feed) { building.catch((e) => console.error('[meta-feed] refresh failed:', e.message)); return feed; }
  return building;
}

export function registerMetaFeedRoutes(app, pool) {
  // Building takes ~45 s (descriptions joined from three tables), so warm it up after boot
  // rather than making Meta's first fetch wait.
  setTimeout(() => getFeed(pool).catch((e) => console.error('[meta-feed] warm-up failed:', e.message)), 40000);
  const send = (pick, name) => async (req, res) => {
    try {
      const f = await getFeed(pool);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `inline; filename="${name}"`,
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex',
        'Last-Modified': new Date(f.builtAt).toUTCString(),
      });
      res.send(pick(f));
    } catch (err) {
      console.error('[meta-feed]', err.message);
      res.status(503).type('text/plain').send('Feed temporarily unavailable');
    }
  };
  app.get('/meta-feed.csv', send((f) => f.csv, 'meta-feed.csv'));
  app.get('/meta-feed-test.csv', send((f) => f.testCsv, 'meta-feed-test.csv'));
  app.get('/meta-feed-skipped.csv', send((f) => f.skippedCsv, 'skipped_rows.csv'));
  app.get('/api/meta-feed/report', async (req, res) => {
    try { res.set('Cache-Control', 'no-cache').json((await getFeed(pool)).report); }
    catch (err) { res.status(503).json({ error: 'Feed temporarily unavailable' }); }
  });
}
