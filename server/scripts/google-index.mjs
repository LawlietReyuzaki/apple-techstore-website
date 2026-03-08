/**
 * google-index.mjs
 * Submits all product URLs to Google's Indexing API.
 *
 * ── Setup (one-time, ~10 minutes) ──────────────────────────────────────────
 *
 * 1. Google Cloud Console  https://console.cloud.google.com
 *    a. Create project (or reuse one)
 *    b. Enable "Indexing API":  APIs & Services → Enable APIs → search "Indexing API"
 *    c. Create service account: IAM & Admin → Service Accounts → Create
 *       - Name: appletechstore-indexing
 *       - Role: (none needed at project level)
 *       - Click the account → Keys → Add Key → JSON → Save as:
 *         server/scripts/google-service-account.json
 *
 * 2. Google Search Console  https://search.google.com/search-console
 *    a. Open your property (appletechstore.pk)
 *    b. Settings → Users and permissions → Add user
 *       - Email: the service account email (e.g. appletechstore-indexing@my-project.iam.gserviceaccount.com)
 *       - Permission: Owner  ← must be Owner, not just Editor
 *
 * 3. Install googleapis:
 *    npm install googleapis
 *
 * 4. Run:
 *    node server/scripts/google-index.mjs
 *    node server/scripts/google-index.mjs --dry-run   # preview only, no API calls
 *    node server/scripts/google-index.mjs --limit 100 # submit first 100 only
 *
 * ── Rate limits ──────────────────────────────────────────────────────────
 *  - 200 requests/day default quota
 *  - Request a quota increase at: https://console.cloud.google.com/apis/api/indexing.googleapis.com/quotas
 *  - For 11,933 products you need ~60 days at 200/day, OR request 2000/day quota increase
 *  - Script batches at 190/day automatically (leaves headroom)
 * ─────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { google } from 'googleapis';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────
const KEY_FILE      = path.join(__dirname, 'google-service-account.json');
const PROGRESS_FILE = path.join(__dirname, '.index-progress.json');
const SITEMAP_URL   = 'https://appletechstore.pk/sitemap-products.xml';
const DAILY_LIMIT   = 190;          // stay under 200/day quota
const DELAY_MS      = 1100;         // ~1 req/sec — well within rate limits
const DRY_RUN       = process.argv.includes('--dry-run');
const LIMIT_ARG     = process.argv.indexOf('--limit');
const MAX_URLS      = LIMIT_ARG !== -1 ? Number(process.argv[LIMIT_ARG + 1]) : Infinity;

// ── helpers ──────────────────────────────────────────────────
const log  = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { timeout: 15000 }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve(body));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { submitted: [], failed: [], lastRun: null };
}

function saveProgress(state) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2));
}

// ── main ──────────────────────────────────────────────────────
async function main() {
  // Validate setup
  if (!existsSync(KEY_FILE)) {
    console.error(`
❌  Service account key not found at:
    ${KEY_FILE}

Steps to create it:
  1. https://console.cloud.google.com → IAM & Admin → Service Accounts
  2. Create account → Keys → Add Key → JSON
  3. Save the downloaded file as server/scripts/google-service-account.json
  4. In Google Search Console → Settings → Users → Add Owner with the service account email
`);
    process.exit(1);
  }

  log('📡 Loading sitemap:', SITEMAP_URL);
  const xml = await fetchText(SITEMAP_URL);
  const allUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  log(`   Found ${allUrls.length} URLs in sitemap`);

  if (allUrls.length === 0) {
    console.error('❌ Sitemap is empty. Check https://appletechstore.pk/sitemap-products.xml');
    process.exit(1);
  }

  // Sample first URL for sanity check
  const sample = allUrls[0];
  const looksLikeSlug = /\/product\/[a-z0-9-]+-[0-9a-f]{8}$/.test(sample);
  if (!looksLikeSlug) {
    log(`⚠️  First URL looks like a UUID, not a slug: ${sample}`);
    log('   Run the DB migration and redeploy before indexing.');
  } else {
    log(`   Sample URL: ${sample}  ✅ slug format`);
  }

  // Load progress (resume from previous run)
  const progress = loadProgress();
  const alreadyDone = new Set([...progress.submitted, ...progress.failed]);
  const pending = allUrls
    .filter(u => !alreadyDone.has(u))
    .slice(0, MAX_URLS);

  log(`   Pending: ${pending.length}  Already submitted: ${progress.submitted.length}  Failed: ${progress.failed.length}`);

  if (pending.length === 0) {
    log('✅ All URLs already submitted. Delete .index-progress.json to reset.');
    return;
  }

  if (DRY_RUN) {
    log('\n🔍 DRY RUN — no API calls. First 5 URLs that would be submitted:');
    pending.slice(0, 5).forEach(u => log('  ', u));
    log(`  ... and ${pending.length - 5} more`);
    return;
  }

  // Auth
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  const authClient = await auth.getClient();
  const indexing   = google.indexing({ version: 'v3', auth: authClient });

  // Submit in batches of DAILY_LIMIT
  const batch = pending.slice(0, DAILY_LIMIT);
  log(`\n🚀 Submitting ${batch.length} URLs (daily limit: ${DAILY_LIMIT})`);
  if (DRY_RUN) { log('(dry run — skipping)'); return; }

  let successCount = 0, failCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const url = batch[i];
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: { url, type: 'URL_UPDATED' },
      });
      progress.submitted.push(url);
      successCount++;
      if ((i + 1) % 10 === 0 || i === batch.length - 1) {
        log(`  [${i + 1}/${batch.length}] ✅ ${url}`);
        saveProgress({ ...progress, lastRun: new Date().toISOString() });
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message;
      log(`  [${i + 1}/${batch.length}] ❌ ${url} — ${msg}`);
      progress.failed.push(url);
      failCount++;

      // 429 = quota exceeded — stop and save progress
      if (err?.response?.status === 429) {
        log('\n⚠️  Quota exceeded (429). Progress saved. Re-run tomorrow.');
        saveProgress({ ...progress, lastRun: new Date().toISOString() });
        break;
      }
    }
    await sleep(DELAY_MS);
  }

  saveProgress({ ...progress, lastRun: new Date().toISOString() });
  log(`\n✅ Done. Submitted: ${successCount}  Failed: ${failCount}`);
  log(`   Remaining in queue: ${pending.length - batch.length}`);
  if (pending.length - batch.length > 0) {
    log('   Re-run tomorrow to continue (progress is saved).');
  }

  if (failCount > 0) {
    log(`\n⚠️  ${failCount} failures logged in .index-progress.json`);
    log('   Common causes:');
    log('   - Service account not added as Owner in Search Console');
    log('   - Indexing API not enabled in Google Cloud Console');
    log('   - URL returns 404 or redirect on live site');
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
