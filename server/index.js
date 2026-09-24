// build trigger 2026-03-08
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fsPromises, readFileSync } from 'fs';
import { OAuth2Client } from 'google-auth-library';
import pool from './db.js';
import { parseSelect, buildSelectSQL, buildWhereSQL, buildOrderSQL } from './queryBuilder.js';
import { sendOrderEmails, sendEmailForType, sendPartRequestEmail } from './emailService.js';
import {
  isBot, buildHTML, injectMeta, injectBasic, notFoundHtml,
  productMeta, sparePartMeta, shopItemMeta,
} from './botRenderer.js';
import { Storage } from '@google-cloud/storage';
import { registerCatalogRoutes } from './catalog/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.LOCAL_API_PORT || process.env.PORT || 3001; // LOCAL_API_PORT for dev, PORT injected by Cloud Run
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-in-production';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));

// Serve scraped product images from project root /images folder
app.use('/images', express.static(join(__dirname, '..', 'images')));

// Serve built React frontend (only present in production/Docker)
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

const SITE = 'https://appletechstore.pk';

// â”€â”€ Public config (frontend fetches this to get runtime env vars) â”€â”€â”€â”€
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// â”€â”€ Image upload (base64 JSON â†’ local filesystem) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Bucket name maps to subfolder under project-root /images/
// NOTE: On Cloud Run the filesystem is ephemeral â€” images survive until
// the next deployment/restart.  Migrate to GCS for permanent storage.
app.post('/api/upload-image', async (req, res) => {
  try {
    const { base64, fileName, bucket } = req.body;
    if (!base64 || !fileName) {
      return res.status(400).json({ error: 'Missing required fields: base64, fileName' });
    }

    // Sanitise filename â€” allow alphanum, dash, underscore, dot only
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    if (!safeName) return res.status(400).json({ error: 'Invalid fileName' });

    const subfolder =
      bucket === 'spare-parts-images' ? 'spare-parts' :
      bucket === 'product-images'     ? 'products'    : 'uploads';

    const imagesDir = join(__dirname, '..', 'images', subfolder);
    await fsPromises.mkdir(imagesDir, { recursive: true });

    const buffer = Buffer.from(base64, 'base64');
    await fsPromises.writeFile(join(imagesDir, safeName), buffer);

    // Return relative path â€” getImageUrl() in the frontend adds the leading slash
    res.json({ path: `images/${subfolder}/${safeName}` });
  } catch (err) {
    console.error('[upload-image] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ Admin: missing images + permanent GCS upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Images uploaded here go to the public GCS bucket (permanent) and the URL
// is written straight into the item's images[] column â€” so they survive
// deploys and are reused everywhere the item renders.
const GCS_BUCKET = 'dilbar-product-images';
let gcsBucket = null;
try {
  // On Cloud Run this uses the service account's default credentials (ADC).
  gcsBucket = new Storage().bucket(GCS_BUCKET);
} catch (e) {
  console.error('[gcs] init failed:', e.message);
}

// Condition matching an item that has NO usable image
const NO_IMAGE_SQL = `images IS NULL OR array_length(images, 1) IS NULL OR btrim(array_to_string(images, '')) = ''`;

app.get('/api/admin/missing-images', async (req, res) => {
  try {
    const products = (await pool.query(
      `SELECT id, name, brand FROM products WHERE ${NO_IMAGE_SQL} ORDER BY name`)).rows;
    const spare_parts = (await pool.query(
      `SELECT id, name FROM spare_parts WHERE ${NO_IMAGE_SQL} ORDER BY name`)).rows;
    res.json({
      products, spare_parts,
      counts: { products: products.length, spare_parts: spare_parts.length },
    });
  } catch (err) {
    console.error('[missing-images] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/upload-image-gcs', async (req, res) => {
  try {
    const { base64, fileName, table, id } = req.body;
    if (!base64 || !fileName || !table || !id) {
      return res.status(400).json({ error: 'Missing required fields: base64, fileName, table, id' });
    }
    if (!['products', 'spare_parts'].includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    if (!gcsBucket) return res.status(500).json({ error: 'Image storage is not configured on the server' });

    const ext = (String(fileName).split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const destination = `images/admin-uploads/${id}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(base64, 'base64');

    await gcsBucket.file(destination).save(buffer, {
      resumable: false,
      contentType,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });
    const url = `https://storage.googleapis.com/${GCS_BUCKET}/${destination}`;

    // Drop any empty strings, then append the new URL â†’ guarantees images[0] is real
    const upd = await pool.query(
      `UPDATE ${table}
         SET images = array_append(
           ARRAY(SELECT e FROM unnest(COALESCE(images, ARRAY[]::text[])) AS e WHERE btrim(e) <> ''),
           $1
         )
       WHERE id = $2
       RETURNING images`,
      [url, id]
    );
    if (upd.rowCount === 0) return res.status(404).json({ error: 'Item not found' });

    onCatalogSourceChange(table);   // new image â†’ category pages show it
    res.json({ url, images: upd.rows[0].images });
  } catch (err) {
    console.error('[upload-image-gcs] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ DB diagnostic (temporary) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/db-test', async (req, res) => {
  const results = {
    connection_mode: process.env.CLOUD_SQL_CONNECTION_NAME
      ? `unix-socket (/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME})`
      : `tcp (${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || '5433'})`,
  };
  try {
    await pool.query('SELECT 1');
    results.connection = 'OK';
  } catch (e) { results.connection = 'FAIL: ' + e.message; }
  try {
    await pool.query('SELECT count(*) FROM auth.users');
    results.auth_users = 'OK';
  } catch (e) { results.auth_users = 'FAIL: ' + e.message; }
  try {
    await pool.query('SELECT count(*) FROM profiles');
    results.profiles = 'OK';
  } catch (e) { results.profiles = 'FAIL: ' + e.message; }
  try {
    await pool.query('SELECT count(*) FROM user_roles');
    results.user_roles = 'OK';
  } catch (e) { results.user_roles = 'FAIL: ' + e.message; }
  try {
    const r = await pool.query(`SELECT typname FROM pg_type WHERE typname = 'app_role'`);
    results.app_role_enum = r.rows.length > 0 ? 'OK' : 'MISSING';
  } catch (e) { results.app_role_enum = 'FAIL: ' + e.message; }
  res.json(results);
});

// â”€â”€ robots.txt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
`User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/sitemap-products.xml
Sitemap: ${SITE}/sitemap-parts.xml
`);
});

// â”€â”€ sitemap-index â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/sitemap.xml', (req, res) => {
  const now = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-pages.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-products.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-parts.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-categories.xml</loc><lastmod>${now}</lastmod></sitemap>
</sitemapindex>`);
});

// â”€â”€ sitemap-pages.xml (static pages) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/sitemap-pages.xml', (req, res) => {
  const now = new Date().toISOString().split('T')[0];
  const pages = ['/', '/shop', '/phones', '/laptops', '/accessories', '/spare-parts', '/book-repair', '/request-part'];
  const urls = pages.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

// â”€â”€ sitemap-products.xml (all products from DB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/sitemap-products.xml', async (req, res) => {
  try {
    // Try with slug column; fall back to id-only if migration hasn't run yet.
    let rows;
    try {
      ({ rows } = await pool.query(
        `SELECT id, slug, updated_at FROM products
         WHERE images IS NOT NULL AND array_length(images,1) > 0
         ORDER BY updated_at DESC LIMIT 50000`
      ));
    } catch (colErr) {
      // slug column missing â€” use id only until migration runs
      ({ rows } = await pool.query(
        `SELECT id, NULL AS slug, updated_at FROM products
         WHERE images IS NOT NULL AND array_length(images,1) > 0
         ORDER BY updated_at DESC LIMIT 50000`
      ));
    }

    const today = new Date().toISOString().split('T')[0];
    const urls = rows.map(r => {
      const lastmod = r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : today;
      const loc = r.slug ? r.slug : r.id;
      return `  <url><loc>${SITE}/product/${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    }).join('\n');

    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  } catch (err) {
    console.error('[sitemap-products] Error:', err.message);
    res.status(500).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
  }
});

// â”€â”€ sitemap-parts.xml (spare parts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/sitemap-parts.xml', async (req, res) => {
  try {
    // Try with visible filter; fall back to no filter if column missing.
    // Prefer slug URLs; fall back gracefully if a column is missing.
    let rows;
    const attempts = [
      `SELECT id, slug, updated_at FROM spare_parts WHERE visible = true ORDER BY updated_at DESC LIMIT 50000`,
      `SELECT id, NULL AS slug, updated_at FROM spare_parts WHERE visible = true ORDER BY updated_at DESC LIMIT 50000`,
      `SELECT id, NULL AS slug, updated_at FROM spare_parts ORDER BY updated_at DESC LIMIT 50000`,
    ];
    for (const sql of attempts) {
      try { ({ rows } = await pool.query(sql)); break; } catch { /* try next */ }
    }
    rows = rows || [];

    const today = new Date().toISOString().split('T')[0];
    const urls = rows.map(r => {
      const lastmod = r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : today;
      return `  <url><loc>${SITE}/spare-part/${r.slug || r.id}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
    }).join('\n');

    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  } catch (err) {
    console.error('[sitemap-parts] Error:', err.message);
    res.status(500).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
  }
});

// â”€â”€ Dynamic rendering for bots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sets headers required for dynamic rendering to work correctly behind CDNs/proxies.
// Vary: User-Agent tells any caching layer that the response differs per bot/human.
// Without this, a CDN may cache the SPA HTML and serve it to Googlebot.
function setBotHeaders(res) {
  res.set('Vary', 'User-Agent');
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.set('X-Robots-Tag', 'index, follow');
}

// The built React shell, read once per deploy
let _indexHtml = null;
function getIndexHtml() {
  if (_indexHtml === null) {
    try { _indexHtml = readFileSync(join(distPath, 'index.html'), 'utf8'); }
    catch { _indexHtml = ''; } // local dev without a build: fall back to sendFile
  }
  return _indexHtml;
}

// Bots get the full server-rendered page; people get the React app with the
// same per-page title/canonical/OG/JSON-LD already in the HTML.
function sendPage(req, res, meta, status = 200) {
  if (isBot(req.headers['user-agent'])) {
    setBotHeaders(res);
    return res.status(status).type('html').send(buildHTML(meta));
  }
  const base = getIndexHtml();
  res.set('Cache-Control', 'no-cache');
  if (!base) return res.status(status).sendFile(join(distPath, 'index.html'));
  res.status(status).type('html').send(injectMeta(base, meta));
}

// Real HTTP 404 (not a "soft 404"); people still see the app's not-found screen
function sendNotFound(req, res) {
  res.set('X-Robots-Tag', 'noindex');
  if (isBot(req.headers['user-agent'])) return res.status(404).type('html').send(notFoundHtml());
  const base = getIndexHtml();
  res.set('Cache-Control', 'no-cache');
  if (!base) return res.status(404).sendFile(join(distPath, 'index.html'));
  res.status(404).type('html').send(injectBasic(base, { path: req.path, noindex: true }));
}

// Permanent redirect, keeping any tracking query string (?utm_â€¦, ?fbclidâ€¦)
function redirect301(req, res, path) {
  const q = req.originalUrl.indexOf('?');
  res.redirect(301, path + (q >= 0 ? req.originalUrl.slice(q) : ''));
}

// Category slugs rarely change â€” cache them instead of querying on every page view
const categorySlugCache = new Map();
async function categorySlugFor(categoryName) {
  if (!categoryName) return null;
  if (categorySlugCache.has(categoryName)) return categorySlugCache.get(categoryName);
  try {
    const { rows } = await pool.query('SELECT slug FROM shop_categories WHERE name = $1 LIMIT 1', [categoryName]);
    const slug = rows[0]?.slug || null;
    categorySlugCache.set(categoryName, slug);
    return slug;
  } catch { return null; } // breadcrumb just falls back to /shop
}

app.get('/product/:idOrSlug', async (req, res, next) => {
  const key = req.params.idOrSlug;
  let product;
  try {
    const col = UUID_RE.test(key) ? 'p.id' : 'p.slug';
    ({ rows: [product] } = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${col} = $1`,
      [key]
    ));

    // Old UUID link â†’ its slug URL (rankings and shared links carry over)
    if (product && col === 'p.id' && product.slug) return redirect301(req, res, `/product/${product.slug}`);

    // Unknown slug, but the 8-char id suffix matches â†’ product was renamed
    if (!product && col === 'p.slug') {
      const m = key.match(/-([0-9a-f]{8})$/i);
      if (m) {
        const { rows } = await pool.query(
          `SELECT slug FROM products WHERE id::text LIKE $1 AND slug IS NOT NULL LIMIT 2`,
          [`${m[1].toLowerCase()}%`]
        );
        if (rows.length === 1) return redirect301(req, res, `/product/${rows[0].slug}`);
      }
    }
  } catch (err) {
    console.error('[product page] lookup failed:', err.message);
    return next(); // DB trouble: serve the normal app, never a false 404
  }
  if (!product) return sendNotFound(req, res);
  product.category_slug = await categorySlugFor(product.category_name);
  sendPage(req, res, productMeta(product));
});

app.get('/spare-part/:id', async (req, res, next) => {
  const key = req.params.id;
  let part;
  try {
    const isUuid = UUID_RE.test(key);
    ({ rows: [part] } = await pool.query(
      `SELECT * FROM spare_parts WHERE ${isUuid ? 'id' : 'slug'} = $1`, [key]
    ));

    // Old UUID link â†’ its slug URL
    if (part && isUuid && part.slug) return redirect301(req, res, `/spare-part/${part.slug}`);

    // Unknown slug, but the 8-char id suffix matches â†’ part was renamed
    if (!part && !isUuid) {
      const m = key.match(/-([0-9a-f]{8})$/i);
      if (m) {
        const { rows } = await pool.query(
          `SELECT slug FROM spare_parts WHERE id::text LIKE $1 AND slug IS NOT NULL LIMIT 2`,
          [`${m[1].toLowerCase()}%`]
        );
        if (rows.length === 1) return redirect301(req, res, `/spare-part/${rows[0].slug}`);
      }
    }
  } catch (err) {
    console.error('[spare-part page] lookup failed:', err.message);
    return next(); // DB trouble: serve the normal app, never a false 404
  }
  if (!part) return sendNotFound(req, res);
  sendPage(req, res, sparePartMeta(part));
});

app.get('/shop-item/:id', async (req, res, next) => {
  const key = req.params.id;
  let item;
  try {
    if (UUID_RE.test(key)) {
      ({ rows: [item] } = await pool.query('SELECT * FROM shop_items WHERE id = $1', [key]));
    }
  } catch (err) {
    console.error('[shop-item page] lookup failed:', err.message);
    return next();
  }
  if (!item) return sendNotFound(req, res);
  sendPage(req, res, shopItemMeta(item));
});

// â”€â”€ Category layer: /brands/â€¦, /parts/â€¦, /phones/price/â€¦ (+ API, sitemap) â”€â”€
// Additive: existing product/spare-part URLs, canonicals and sitemaps are untouched.
const catalog = registerCatalogRoutes(app, { pool, sendPage, sendNotFound, verifyToken });

// â”€â”€ SEO debug endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/seo-debug?url=/product/some-slug
// Returns what headers + bot-detection result the server would use for a given path.
app.get('/api/seo-debug', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const xRobots = res.getHeader('X-Robots-Tag') || '(not set on this response)';
  res.json({
    your_user_agent: ua,
    bot_detected: isBot(ua),
    incoming_headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'x-robots-tag': req.headers['x-robots-tag'] || null,
      'cache-control': req.headers['cache-control'] || null,
    },
    what_bots_get: {
      'Vary': 'User-Agent',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'index, follow',
      'Content-Type': 'text/html; charset=utf-8',
    },
    test_tip: 'To simulate Googlebot add header: User-Agent: Googlebot/2.1',
  });
});

// â”€â”€ Auth middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function verifyToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// â”€â”€ Auth routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// POST /auth/v1/signup
app.post('/auth/v1/signup', async (req, res) => {
  try {
    const { email, password, options } = req.body;
    const meta = options?.data || {};

    if (!email || !password)
      return res.status(400).json({ error: { message: 'Email and password are required' } });

    // Check duplicate
    const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: { message: 'User already registered' } });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
       VALUES ($1, $2, $3, now()) RETURNING id, email, raw_user_meta_data, created_at`,
      [email, hashed, JSON.stringify(meta)]
    );
    const user = result.rows[0];

    // Create profile â€” non-fatal if table missing
    try {
      await pool.query(
        `INSERT INTO profiles (id, full_name, phone) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [user.id, meta.full_name || null, meta.phone || null]
      );
    } catch (profileErr) {
      console.warn('profiles insert skipped:', profileErr.message);
    }

    // Assign customer role â€” non-fatal
    try {
      await pool.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, 'customer') ON CONFLICT DO NOTHING`,
        [user.id]
      );
    } catch (roleErr) {
      console.warn('user_roles insert skipped:', roleErr.message);
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      data: {
        user: formatUser(user),
        session: buildSession(token, user),
      },
      error: null,
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /auth/v1/token  (sign-in)
app.post('/auth/v1/token', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, encrypted_password, raw_user_meta_data FROM auth.users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ error: { message: 'Invalid email or password' } });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.encrypted_password || '');
    if (!valid)
      return res.status(400).json({ error: { message: 'Invalid email or password' } });

    await pool.query('UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1', [user.id]);

    const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      data: {
        user: formatUser(user),
        session: buildSession(token, user),
      },
      error: null,
    });
  } catch (err) {
    console.error('Signin error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /auth/v1/admin-token  (admin sign-in â€” checks user_roles for 'admin')
app.post('/auth/v1/admin-token', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: { message: 'Email and password required' } });

    const result = await pool.query(
      `SELECT u.id, u.email, u.encrypted_password, u.raw_user_meta_data
       FROM auth.users u
       JOIN user_roles r ON r.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL AND r.role = 'admin'`,
      [email]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ error: { message: 'Invalid email or password' } });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.encrypted_password || '');
    if (!valid)
      return res.status(400).json({ error: { message: 'Invalid email or password' } });

    await pool.query('UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1', [user.id]);

    const token = jwt.sign({ sub: user.id, email: user.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ data: { user: formatUser(user), session: buildSession(token, user) }, error: null });
  } catch (err) {
    console.error('Admin signin error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /auth/v1/google  (Google Sign-In â€” verify ID token, find/create user)
app.post('/auth/v1/google', async (req, res) => {
  try {
    const { id_token } = req.body;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID)
      return res.status(500).json({ error: { message: 'Google OAuth not configured' } });

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: id_token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || email;

    // Find or create user
    let result = await pool.query(
      'SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    let user;
    if (result.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO auth.users (email, raw_user_meta_data, email_confirmed_at)
         VALUES ($1, $2, now()) RETURNING id, email, raw_user_meta_data`,
        [email, JSON.stringify({ full_name: name, provider: 'google' })]
      );
      user = ins.rows[0];
      await pool.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, 'customer') ON CONFLICT DO NOTHING`,
        [user.id]
      );
    } else {
      user = result.rows[0];
    }

    await pool.query('UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1', [user.id]);
    const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ data: { user: formatUser(user), session: buildSession(token, user) }, error: null });
  } catch (err) {
    console.error('Google signin error:', err.message);
    res.status(400).json({ error: { message: 'Google sign-in failed: ' + err.message } });
  }
});

// POST /auth/v1/admin-google  (Google Sign-In for admin â€” must have admin role)
app.post('/auth/v1/admin-google', async (req, res) => {
  try {
    const { id_token } = req.body;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID)
      return res.status(500).json({ error: { message: 'Google OAuth not configured' } });

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: id_token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email;

    const result = await pool.query(
      `SELECT u.id, u.email, u.raw_user_meta_data
       FROM auth.users u
       JOIN user_roles r ON r.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL AND r.role = 'admin'`,
      [email]
    );
    if (result.rows.length === 0)
      return res.status(403).json({ error: { message: 'Not authorized as admin' } });

    const user = result.rows[0];
    await pool.query('UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1', [user.id]);
    const token = jwt.sign({ sub: user.id, email: user.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ data: { user: formatUser(user), session: buildSession(token, user) }, error: null });
  } catch (err) {
    console.error('Admin Google signin error:', err.message);
    res.status(400).json({ error: { message: 'Google sign-in failed: ' + err.message } });
  }
});

// POST /auth/v1/logout
app.post('/auth/v1/logout', (req, res) => {
  res.json({ error: null });
});

// GET /auth/v1/user
app.get('/auth/v1/user', async (req, res) => {
  const claims = verifyToken(req);
  if (!claims) return res.status(401).json({ error: { message: 'Not authenticated' } });

  const result = await pool.query(
    'SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1',
    [claims.sub]
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: { message: 'User not found' } });

  res.json({ data: { user: formatUser(result.rows[0]) }, error: null });
});

// â”€â”€ Simple in-memory query cache (TTL: 60s for lists, 300s for static tables) â”€â”€
const queryCache = new Map();
const CACHE_TTL = {
  products:        60_000,
  spare_parts:     60_000,
  shop_items:      60_000,
  categories:      300_000,
  shop_categories: 300_000,
  part_categories: 300_000,
  shop_brands:     300_000,
};
function getCached(key) {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { queryCache.delete(key); return null; }
  return entry.data;
}
function setCached(key, data, ttl) {
  queryCache.set(key, { data, expiresAt: Date.now() + ttl });
}
// Invalidate cache for a table on writes
function invalidateTable(table) {
  for (const key of queryCache.keys()) {
    if (key.startsWith(`${table}:`)) queryCache.delete(key);
  }
  onCatalogSourceChange(table);
}

// Products / spare parts changed â†’ refresh the category layer in the background
// (debounced: many quick edits trigger one rebuild ~2 minutes after the last change)
const CATALOG_SOURCE_TABLES = new Set(['products', 'spare_parts', 'shop_items', 'categories', 'part_categories']);
function onCatalogSourceChange(table) {
  if (CATALOG_SOURCE_TABLES.has(table)) catalog.scheduleRebuild();
}

// â”€â”€ Data routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /rest/v1/:table â€” SELECT
app.get('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { select, filters: rawFilters, order: rawOrder, limit, offset, single } = req.query;

    // Check cache for list queries (not single-row lookups)
    const ttl = CACHE_TTL[table];
    const cacheKey = `${table}:${JSON.stringify(req.query)}`;
    if (ttl && single !== 'true' && single !== '1') {
      const cached = getCached(cacheKey);
      if (cached) return res.json({ data: cached, error: null });
    }

    // Parse select AST
    const selectAST = parseSelect(select || '*');

    // Build SQL pieces
    const params = [];
    const selectClause = buildSelectSQL(table, selectAST);
    const whereClause  = buildWhereSQL(rawFilters ? JSON.parse(rawFilters) : [], params);
    const userOrder    = buildOrderSQL(rawOrder ? JSON.parse(rawOrder) : []);
    // Cap at 1000 rows to prevent OOM â€” callers must use limit+offset for pagination
    const MAX_ROWS = 1000;
    const requestedLimit = limit ? parseInt(limit) : null;
    const effectiveLimit = requestedLimit ? Math.min(requestedLimit, MAX_ROWS) : MAX_ROWS;
    const limitClause  = `LIMIT ${effectiveLimit}`;
    const offsetClause = offset ? `OFFSET ${parseInt(offset)}`  : '';

    // For product/spare_part listings always rank items with images above those without
    const hasImagesCol = table === 'products' || table === 'spare_parts';
    // TRUE only when the item has at least one NON-EMPTY image string.
    // (array_length>0 wrongly counted arrays of empty strings like ['','',''] as "has image".)
    const imageFirstExpr = hasImagesCol
      ? "(t.images IS NOT NULL AND btrim(array_to_string(t.images, '')) <> '') DESC"
      : null;
    const orderClause = imageFirstExpr
      ? `ORDER BY ${imageFirstExpr}${userOrder ? ', ' + userOrder.replace(/^ORDER BY\s*/i, '') : ''}`
      : userOrder;

    const sql = `SELECT ${selectClause} FROM ${table} t ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`.trim();

    const result = await pool.query(sql, params);

    if (single === 'true' || single === '1') {
      if (result.rows.length === 0) return res.json({ data: null, error: null });
      return res.json({ data: result.rows[0], error: null });
    }

    if (ttl) setCached(cacheKey, result.rows, ttl);
    res.json({ data: result.rows, error: null });
  } catch (err) {
    console.error(`GET /rest/v1/${req.params.table} error:`, err.message);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// POST /rest/v1/:table â€” INSERT
app.post('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const { upsert, onConflict } = req.query;

    const inserted = [];
    for (const row of rows) {
      const keys = Object.keys(row).filter(k => row[k] !== undefined);
      if (keys.length === 0) continue;

      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const vals = keys.map(k => row[k]);

      let sql;
      if (upsert === 'true' && onConflict) {
        const conflictCols = onConflict;
        const updateSet = keys.filter(k => k !== conflictCols).map((k, i) => `${k} = EXCLUDED.${k}`).join(', ');
        sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
               ON CONFLICT (${conflictCols}) DO ${updateSet ? `UPDATE SET ${updateSet}` : 'NOTHING'}
               RETURNING *`;
      } else {
        sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`;
      }

      const result = await pool.query(sql, vals);
      inserted.push(...result.rows);
    }

    invalidateTable(table);
    res.json({ data: inserted.length === 1 ? inserted[0] : inserted, error: null });
  } catch (err) {
    console.error(`POST /rest/v1/${req.params.table} error:`, err.message);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// PATCH /rest/v1/:table â€” UPDATE
app.patch('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { filters: rawFilters } = req.query;
    const updates = req.body;

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ data: [], error: null });

    const params = keys.map(k => updates[k]);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const filters = rawFilters ? JSON.parse(rawFilters) : [];
    const whereClause = buildWhereSQL(filters, params, 't');

    const sql = `UPDATE ${table} t SET ${setClause} ${whereClause} RETURNING t.*`;
    const result = await pool.query(sql, params);

    invalidateTable(table);
    res.json({ data: result.rows, error: null });
  } catch (err) {
    console.error(`PATCH /rest/v1/${req.params.table} error:`, err.message);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// DELETE /rest/v1/:table â€” DELETE
app.delete('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { filters: rawFilters } = req.query;
    const filters = rawFilters ? JSON.parse(rawFilters) : [];

    const params = [];
    const whereClause = buildWhereSQL(filters, params, 't');

    const sql = `DELETE FROM ${table} t ${whereClause} RETURNING t.*`;
    const result = await pool.query(sql, params);

    onCatalogSourceChange(table);
    res.json({ data: result.rows, error: null });
  } catch (err) {
    console.error(`DELETE /rest/v1/${req.params.table} error:`, err.message);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// â”€â”€ Admin cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /admin/clear-test-data â€” deletes all orders+repairs before March 12, 2026
app.post('/admin/clear-test-data', async (req, res) => {
  try {
    const cutoff = '2026-03-12T00:00:00Z';
    // Get old order IDs first
    const oldOrders = await pool.query(
      "SELECT id FROM orders WHERE created_at < $1", [cutoff]
    );
    const orderIds = oldOrders.rows.map(r => r.id);

    if (orderIds.length > 0) {
      // Clear circular FK on orders first
      await pool.query(
        "UPDATE orders SET payment_id = NULL WHERE created_at < $1", [cutoff]
      );
      // Delete dependent rows
      await pool.query(
        "DELETE FROM payments WHERE order_id = ANY($1::uuid[])", [orderIds]
      );
      await pool.query(
        "DELETE FROM order_items WHERE order_id = ANY($1::uuid[])", [orderIds]
      );
      await pool.query(
        "DELETE FROM orders WHERE created_at < $1", [cutoff]
      );
    }

    // Delete old repairs
    const repairsResult = await pool.query(
      "DELETE FROM repairs WHERE created_at < $1 RETURNING id", [cutoff]
    );

    res.json({
      success: true,
      deletedOrders: orderIds.length,
      deletedRepairs: repairsResult.rowCount,
    });
  } catch (err) {
    console.error('[clear-test-data] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ Edge functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// POST /functions/v1/create-order â€” local replacement for Supabase edge function
app.post('/functions/v1/create-order', async (req, res) => {
  try {
    const {
      customerName, customerEmail, customerPhone,
      deliveryAddress, notes, totalAmount, userId, items,
    } = req.body;

    if (!customerName || !customerPhone || !deliveryAddress) {
      return res.status(400).json({ error: 'Missing required fields: name, phone, and address are required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Insert order
    const orderResult = await pool.query(
      `INSERT INTO orders
         (user_id, customer_name, customer_email, customer_phone, delivery_address,
          total_amount, notes, status, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending','unpaid')
       RETURNING *`,
      [userId || null, customerName, customerEmail || null, customerPhone,
       deliveryAddress, totalAmount, notes || null]
    );
    const order = orderResult.rows[0];

    // Insert order items
    for (const item of items) {
      const itemType = item.type || 'product';
      const productId    = itemType === 'product'    ? item.id : null;
      const sparePartId  = itemType === 'spare_part' ? item.id : null;
      const shopItemId   = itemType === 'shop_item'  ? item.id : null;

      await pool.query(
        `INSERT INTO order_items
           (order_id, product_id, spare_part_id, shop_item_id, item_type,
            product_name, product_price, quantity, subtotal,
            selected_color, selected_part_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [order.id, productId, sparePartId, shopItemId, itemType,
         item.name, item.price, item.quantity, item.price * item.quantity,
         item.selectedColor || null, item.selectedPartType || null]
      );
    }

    // Fetch saved items for email (includes subtotals)
    const savedItems = await pool.query(
      'SELECT product_name, product_price, quantity, subtotal FROM order_items WHERE order_id = $1',
      [order.id]
    );

    // Send emails (fire-and-forget â€” don't block the response)
    sendOrderEmails(order, savedItems.rows).catch(err =>
      console.error('[email] sendOrderEmails failed:', err.message)
    );

    res.json({ success: true, order, message: 'Order created successfully' });
  } catch (err) {
    console.error('create-order error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /functions/v1/send-order-email â€” real email dispatcher
app.post('/functions/v1/send-order-email', async (req, res) => {
  const { type, orderId, repairId, newStatus, declineReason, visitDate, customNote } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Missing required field: type' });
  }

  try {
    let order = null, items = [], payment = null, repair = null;

    // Fetch order (and optionally items/payment) when orderId is provided
    if (orderId) {
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (!orderResult.rows.length) {
        return res.status(404).json({ error: `Order ${orderId} not found` });
      }
      order = orderResult.rows[0];

      // Fetch order items for types that need them
      if (['order_approved', 'payment_approved'].includes(type)) {
        const itemsResult = await pool.query(
          'SELECT product_name, product_price, quantity, subtotal FROM order_items WHERE order_id = $1',
          [orderId]
        );
        items = itemsResult.rows;
      }

      // Fetch payment for refund (to get refund_wallet_number set just before this call)
      if (type === 'payment_refunded') {
        const paymentResult = await pool.query(
          'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
          [orderId]
        );
        payment = paymentResult.rows[0] || null;
      }
    }

    // Fetch repair when repairId is provided
    if (repairId) {
      const repairResult = await pool.query('SELECT * FROM repairs WHERE id = $1', [repairId]);
      if (!repairResult.rows.length) {
        return res.status(404).json({ error: `Repair ${repairId} not found` });
      }
      repair = repairResult.rows[0];
    }

    await sendEmailForType(type, {
      order, items, payment, repair,
      newStatus, declineReason, visitDate, customNote,
    });

    console.log(`[send-order-email] ${type} â†’ success`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[send-order-email] ${type} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /functions/v1/send-part-request-email â€” part request notifications
app.post('/functions/v1/send-part-request-email', async (req, res) => {
  const { type, requestId, newStatus, adminNotes,
          customerName, customerEmail, customerPhone,
          category, partName, partDetails, imageUrl, submittedDate } = req.body;

  if (!type) return res.status(400).json({ error: 'Missing required field: type' });

  try {
    let request = null;

    // Fetch from DB if requestId provided, otherwise build from inline payload
    if (requestId) {
      const result = await pool.query('SELECT * FROM part_requests WHERE id = $1', [requestId]);
      request = result.rows[0] || null;
    }

    // Fall back to inline payload (used when DB row isn't saved yet)
    if (!request) {
      request = {
        id: requestId || null,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        category,
        part_name: partName,
        part_details: partDetails || null,
        image_url: imageUrl || null,
        created_at: submittedDate || new Date().toISOString(),
      };
    }

    await sendPartRequestEmail(type, { request, newStatus, adminNotes });

    console.log(`[send-part-request-email] ${type} â†’ success`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[send-part-request-email] ${type} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /functions/v1/* â€” no-op stub for any other edge functions
app.post('/functions/v1/:name', (req, res) => {
  const { name } = req.params;
  console.log(`[functions stub] ${name} called (no-op in local dev)`);
  res.json({ success: true, message: `${name} is a no-op in local development` });
});

// â”€â”€ Health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: e.message });
  }
});

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatUser(user) {
  const meta = typeof user.raw_user_meta_data === 'string'
    ? JSON.parse(user.raw_user_meta_data || '{}')
    : (user.raw_user_meta_data || {});
  return {
    id: user.id,
    email: user.email,
    user_metadata: meta,
    app_metadata: { role: 'authenticated' },
    created_at: user.created_at,
  };
}

function buildSession(token, user) {
  const decoded = jwt.decode(token);
  return {
    access_token: token,
    token_type: 'bearer',
    expires_at: decoded.exp,
    user: formatUser(user),
  };
}

// â”€â”€ SPA fallback â€” must be LAST route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Serves index.html for any non-API route so React Router works
// Private pages get noindex; every page gets a canonical pointing at itself
// (index.html hard-codes the homepage canonical, which made every page look
// like a duplicate of the homepage to crawlers that don't run JavaScript).
const PRIVATE_ROUTE_RE = /^\/(admin|admin-login|account|cart|checkout|payment-submission|wishlist|login|signup|search)(\/|$)/i;
app.get('*splat', (req, res) => {
  const base = getIndexHtml();
  if (!base) return res.sendFile(join(distPath, 'index.html'));
  const q = req.originalUrl.indexOf('?');
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(injectBasic(base, {
    path: req.path,
    search: q >= 0 ? req.originalUrl.slice(q + 1) : '',
    noindex: PRIVATE_ROUTE_RE.test(req.path),
  }));
});

// â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Run migrations on startup
pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ")
  .then(() => console.log('[migration] orders.due_date column ready'))
  .catch(err => console.warn('[migration] orders.due_date:', err.message));

// Build the category layer on startup if it's missing or older than 6 hours
// (runs in the background; the site serves normally meanwhile)
setTimeout(async () => {
  try {
    const { rows } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM catalog_items)::int AS n, (SELECT MAX(updated_at) FROM catalog_items) AS t`);
    const stale = !rows[0].n || !rows[0].t || Date.now() - new Date(rows[0].t).getTime() > 6 * 3600 * 1000;
    if (stale) await catalog.rebuildNow();
  } catch {
    // tables don't exist yet â†’ first build creates them
    catalog.rebuildNow().catch((e) => console.error('[catalog] initial build failed:', e.message));
  }
}, 20000);

app.listen(PORT, () => {
  console.log(`\nâœ… Local API server running at http://localhost:${PORT}`);
  console.log(`   Auth:  POST http://localhost:${PORT}/auth/v1/signup`);
  console.log(`   Auth:  POST http://localhost:${PORT}/auth/v1/token`);
  console.log(`   Data:  GET  http://localhost:${PORT}/rest/v1/:table`);
  console.log(`   Health:GET  http://localhost:${PORT}/health\n`);
});

export default app;
