// build trigger 2026-03-08
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OAuth2Client } from 'google-auth-library';
import pool from './db.js';
import { parseSelect, buildSelectSQL, buildWhereSQL, buildOrderSQL } from './queryBuilder.js';
import { sendOrderEmails, sendEmailForType, sendPartRequestEmail } from './emailService.js';
import { isBot, renderProduct, renderSparePart, renderShopItem } from './botRenderer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.LOCAL_API_PORT || process.env.PORT || 3001; // LOCAL_API_PORT for dev, PORT injected by Cloud Run
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-in-production';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Serve scraped product images from project root /images folder
app.use('/images', express.static(join(__dirname, '..', 'images')));

// Serve built React frontend (only present in production/Docker)
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

const SITE = 'https://appletechstore.pk';

// ── Public config (frontend fetches this to get runtime env vars) ────
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// ── DB diagnostic (temporary) ─────────────────────────────────
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

// ── robots.txt ────────────────────────────────────────────────
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

// ── sitemap-index ─────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const now = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-pages.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-products.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-parts.xml</loc><lastmod>${now}</lastmod></sitemap>
</sitemapindex>`);
});

// ── sitemap-pages.xml (static pages) ─────────────────────────
app.get('/sitemap-pages.xml', (req, res) => {
  const now = new Date().toISOString().split('T')[0];
  const pages = ['/', '/shop', '/phones', '/laptops', '/accessories', '/spare-parts', '/book-repair', '/request-part'];
  const urls = pages.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

// ── sitemap-products.xml (all products from DB) ───────────────
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
      // slug column missing — use id only until migration runs
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

// ── sitemap-parts.xml (spare parts) ──────────────────────────
app.get('/sitemap-parts.xml', async (req, res) => {
  try {
    // Try with visible filter; fall back to no filter if column missing.
    let rows;
    try {
      ({ rows } = await pool.query(
        `SELECT id, updated_at FROM spare_parts
         WHERE visible = true ORDER BY updated_at DESC LIMIT 50000`
      ));
    } catch (colErr) {
      ({ rows } = await pool.query(
        `SELECT id, updated_at FROM spare_parts
         ORDER BY updated_at DESC LIMIT 50000`
      ));
    }

    const today = new Date().toISOString().split('T')[0];
    const urls = rows.map(r => {
      const lastmod = r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : today;
      return `  <url><loc>${SITE}/spare-part/${r.id}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
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

// ── Dynamic rendering for bots ────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sets headers required for dynamic rendering to work correctly behind CDNs/proxies.
// Vary: User-Agent tells any caching layer that the response differs per bot/human.
// Without this, a CDN may cache the SPA HTML and serve it to Googlebot.
function setBotHeaders(res) {
  res.set('Vary', 'User-Agent');
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.set('X-Robots-Tag', 'index, follow');
}

app.get('/product/:idOrSlug', async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    const { idOrSlug } = req.params;
    const col = UUID_RE.test(idOrSlug) ? 'p.id' : 'p.slug';
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${col} = $1`,
      [idOrSlug]
    );
    if (!rows[0]) return next();
    setBotHeaders(res);
    res.send(renderProduct(rows[0], rows[0].category_name));
  } catch { next(); }
});

app.get('/spare-part/:id', async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    const { rows } = await pool.query('SELECT * FROM spare_parts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return next();
    setBotHeaders(res);
    res.send(renderSparePart(rows[0]));
  } catch { next(); }
});

app.get('/shop-item/:id', async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    const { rows } = await pool.query('SELECT * FROM shop_items WHERE id = $1', [req.params.id]);
    if (!rows[0]) return next();
    setBotHeaders(res);
    res.send(renderShopItem(rows[0]));
  } catch { next(); }
});

// ── SEO debug endpoint ────────────────────────────────────────
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

// ── Auth middleware ──────────────────────────────────────────
function verifyToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// ── Auth routes ──────────────────────────────────────────────

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

    // Create profile — non-fatal if table missing
    try {
      await pool.query(
        `INSERT INTO profiles (id, full_name, phone) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [user.id, meta.full_name || null, meta.phone || null]
      );
    } catch (profileErr) {
      console.warn('profiles insert skipped:', profileErr.message);
    }

    // Assign customer role — non-fatal
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

// POST /auth/v1/admin-token  (admin sign-in — checks user_roles for 'admin')
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

// POST /auth/v1/google  (Google Sign-In — verify ID token, find/create user)
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

// POST /auth/v1/admin-google  (Google Sign-In for admin — must have admin role)
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

// ── Simple in-memory query cache (TTL: 60s for lists, 300s for static tables) ──
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
}

// ── Data routes ──────────────────────────────────────────────

// GET /rest/v1/:table — SELECT
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
    const limitClause  = limit  ? `LIMIT ${parseInt(limit)}`    : '';
    const offsetClause = offset ? `OFFSET ${parseInt(offset)}`  : '';

    // For product/spare_part listings always rank items with images above those without
    const hasImagesCol = table === 'products' || table === 'spare_parts';
    const imageFirstExpr = hasImagesCol
      ? '(t.images IS NOT NULL AND array_length(t.images, 1) > 0) DESC NULLS LAST'
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

// POST /rest/v1/:table — INSERT
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

// PATCH /rest/v1/:table — UPDATE
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

// DELETE /rest/v1/:table — DELETE
app.delete('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { filters: rawFilters } = req.query;
    const filters = rawFilters ? JSON.parse(rawFilters) : [];

    const params = [];
    const whereClause = buildWhereSQL(filters, params, 't');

    const sql = `DELETE FROM ${table} t ${whereClause} RETURNING t.*`;
    const result = await pool.query(sql, params);

    res.json({ data: result.rows, error: null });
  } catch (err) {
    console.error(`DELETE /rest/v1/${req.params.table} error:`, err.message);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// ── Admin cleanup ────────────────────────────────────────────
// POST /admin/clear-test-data — deletes all orders+repairs before March 12, 2026
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

// ── Edge functions ───────────────────────────────────────────

// POST /functions/v1/create-order — local replacement for Supabase edge function
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

    // Send emails (fire-and-forget — don't block the response)
    sendOrderEmails(order, savedItems.rows).catch(err =>
      console.error('[email] sendOrderEmails failed:', err.message)
    );

    res.json({ success: true, order, message: 'Order created successfully' });
  } catch (err) {
    console.error('create-order error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /functions/v1/send-order-email — real email dispatcher
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

    console.log(`[send-order-email] ${type} → success`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[send-order-email] ${type} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /functions/v1/send-part-request-email — part request notifications
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

    console.log(`[send-part-request-email] ${type} → success`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[send-part-request-email] ${type} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /functions/v1/* — no-op stub for any other edge functions
app.post('/functions/v1/:name', (req, res) => {
  const { name } = req.params;
  console.log(`[functions stub] ${name} called (no-op in local dev)`);
  res.json({ success: true, message: `${name} is a no-op in local development` });
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: e.message });
  }
});

// ── Helpers ──────────────────────────────────────────────────
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

// ── SPA fallback — must be LAST route ─────────────────────────
// Serves index.html for any non-API route so React Router works
app.get('*splat', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
// Run migrations on startup
pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ")
  .then(() => console.log('[migration] orders.due_date column ready'))
  .catch(err => console.warn('[migration] orders.due_date:', err.message));

app.listen(PORT, () => {
  console.log(`\n✅ Local API server running at http://localhost:${PORT}`);
  console.log(`   Auth:  POST http://localhost:${PORT}/auth/v1/signup`);
  console.log(`   Auth:  POST http://localhost:${PORT}/auth/v1/token`);
  console.log(`   Data:  GET  http://localhost:${PORT}/rest/v1/:table`);
  console.log(`   Health:GET  http://localhost:${PORT}/health\n`);
});

export default app;
