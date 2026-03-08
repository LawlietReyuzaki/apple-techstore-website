/**
 * verify-seo.mjs
 * Runs locally to verify the slug migration and live sitemap.
 *
 * Usage:
 *   node server/scripts/verify-seo.mjs
 *
 * Prerequisites:
 *   - Docker running (mydatabase_postgres on port 5433)
 *   - Express server running (npm run server)
 */

import pg from 'pg';
import https from 'https';
import http from 'http';

const { Pool } = pg;

const DB = new Pool({
  host:     process.env.DATABASE_HOST     || 'localhost',
  port:     Number(process.env.DATABASE_PORT) || 5433,
  user:     process.env.DATABASE_USER     || 'admin',
  password: process.env.DATABASE_PASSWORD || '123456',
  database: process.env.DATABASE_NAME     || 'mydatabase',
});

const SERVER = process.env.LOCAL_API_URL || 'http://localhost:3001';
const PROD   = 'https://appletechstore.pk';

// ── helpers ──────────────────────────────────────────────────
function ok(msg)   { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.error(`  ❌  ${msg}`); }
function info(msg) { console.log(`  ℹ️   ${msg}`); }
function head(msg) { console.log(`\n${'─'.repeat(60)}\n  ${msg}\n${'─'.repeat(60)}`); }

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { ...opts, timeout: 10000 }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── 1. Migration verification ────────────────────────────────
async function checkMigration() {
  head('1 · Migration verification (DB)');
  let client;
  try {
    client = await DB.connect();

    // Column exists?
    const colCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'slug'
    `);
    if (colCheck.rows.length === 0) {
      fail('slug column MISSING — run the migration first:');
      info('psql -h localhost -p 5433 -U admin -d mydatabase \\');
      info('  -f supabase/migrations/20260308000001_add_product_slugs.sql');
      return false;
    }
    ok(`slug column exists (type: ${colCheck.rows[0].data_type})`);

    // How many products have a slug?
    const counts = await client.query(`
      SELECT
        COUNT(*)                                     AS total,
        COUNT(*) FILTER (WHERE slug IS NOT NULL
          AND slug <> '')                            AS has_slug,
        COUNT(*) FILTER (WHERE slug IS NULL
          OR slug = '')                              AS missing_slug
      FROM products
    `);
    const { total, has_slug, missing_slug } = counts.rows[0];
    info(`Total products:  ${total}`);
    if (Number(missing_slug) === 0) {
      ok(`All ${has_slug} products have a slug`);
    } else {
      fail(`${missing_slug} products are still missing a slug`);
      info('Re-run the migration UPDATE statement to fix them.');
    }

    // Sample — verify format  name-xxxxxxxx
    const sample = await client.query(`
      SELECT name, slug, id
      FROM products
      WHERE slug IS NOT NULL
      ORDER BY random()
      LIMIT 5
    `);
    console.log('\n  Sample slugs:');
    for (const r of sample.rows) {
      const expectedSuffix = r.id.slice(0, 8);
      const hasSuffix = r.slug.endsWith(expectedSuffix);
      const marker = hasSuffix ? '✅' : '⚠️ ';
      console.log(`    ${marker}  "${r.slug}"  (id prefix: ${expectedSuffix})`);
    }

    // Unique index?
    const idx = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'products' AND indexname = 'idx_products_slug'
    `);
    if (idx.rows.length > 0) ok('Unique index idx_products_slug exists');
    else fail('Unique index idx_products_slug NOT found — slugs may collide');

    return Number(missing_slug) === 0;
  } catch (err) {
    fail(`DB connection failed: ${err.message}`);
    info('Is Docker running? Check: docker ps');
    return false;
  } finally {
    client?.release();
  }
}

// ── 2. Sitemap validation ─────────────────────────────────────
async function checkSitemap() {
  head('2 · Sitemap validation');

  for (const base of [SERVER, PROD]) {
    console.log(`\n  Checking ${base}/sitemap-products.xml`);
    try {
      const { status, headers, body } = await fetch(`${base}/sitemap-products.xml`);
      if (status !== 200) { fail(`HTTP ${status}`); continue; }

      const ct = headers['content-type'] || '';
      if (!ct.includes('xml')) fail(`Wrong Content-Type: ${ct} (expected application/xml)`);
      else ok(`Content-Type: ${ct}`);

      // Count URLs
      const urlCount = (body.match(/<loc>/g) || []).length;
      info(`Found ${urlCount} <loc> entries`);

      // Slug vs UUID check (sample first 20)
      const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).slice(0, 20);
      const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const slugRe = /\/product\/[a-z0-9-]+-[0-9a-f]{8}$/;

      let slugCount = 0, uuidCount = 0;
      for (const loc of locs) {
        if (uuidRe.test(loc)) uuidCount++;
        else if (slugRe.test(loc)) slugCount++;
      }
      if (slugCount > 0 && uuidCount === 0) ok(`URLs use descriptive slugs (checked ${locs.length})`);
      else if (uuidCount > 0) fail(`${uuidCount}/${locs.length} URLs still use raw UUIDs — migration not applied yet`);

      // Sample
      console.log('  Sample URLs:');
      locs.slice(0, 3).forEach(l => console.log(`    ${l}`));
    } catch (err) {
      fail(`Request failed: ${err.message}`);
      if (base === SERVER) info('Start the server with: npm run server');
    }
  }
}

// ── 3. Bot detection check ───────────────────────────────────
async function checkBotDetection() {
  head('3 · Bot detection & headers');

  // Fetch a product URL with Googlebot UA from local server
  try {
    const { rows } = await (async () => {
      const c = await DB.connect();
      const r = await c.query('SELECT slug, id FROM products WHERE slug IS NOT NULL LIMIT 1');
      c.release();
      return r;
    })();

    if (!rows[0]) { info('No products with slugs yet — skip bot detection test'); return; }

    const path  = rows[0].slug || rows[0].id;
    const url   = `${SERVER}/product/${path}`;

    // Test with Googlebot UA
    const bot = await fetch(url, {
      headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' },
    });
    if (bot.body.includes('<h1>') && bot.body.includes('schema.org')) {
      ok(`Bot UA → server returns pre-rendered HTML (${bot.body.length} bytes)`);
    } else if (bot.body.includes('<div id="root">') && !bot.body.includes('<h1>')) {
      fail('Bot UA → server returned empty SPA HTML — bot renderer not working!');
      info('Check that npm run server is using the latest server/index.js');
    } else {
      info(`Bot response length: ${bot.body.length} bytes`);
    }

    // Check Vary header
    const vary = bot.headers['vary'] || '';
    if (vary.toLowerCase().includes('user-agent')) ok(`Vary: User-Agent header present`);
    else fail(`Vary header missing or wrong: "${vary}" — CDNs will cache the wrong response for bots`);

    // Check X-Robots-Tag
    const xRobots = bot.headers['x-robots-tag'] || '';
    if (xRobots.includes('noindex')) fail(`X-Robots-Tag: "${xRobots}" — this blocks indexing!`);
    else if (xRobots) ok(`X-Robots-Tag: ${xRobots}`);
    else info('X-Robots-Tag not set (default = indexable, which is fine)');

    // Test with human UA — should get SPA HTML
    const human = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (human.body.includes('<div id="root">')) ok('Human UA → server returns SPA (index.html) correctly');
    else info(`Human response: ${human.body.slice(0, 100)}`);

  } catch (err) {
    fail(`Bot detection test failed: ${err.message}`);
  }
}

// ── run all checks ───────────────────────────────────────────
(async () => {
  console.log('\n🔍  AppleTechStore SEO Verification\n');
  await checkMigration();
  await checkSitemap();
  await checkBotDetection();
  console.log('\n✅  Done. Review any ❌ failures above before submitting to Google.\n');
  await DB.end();
})();
