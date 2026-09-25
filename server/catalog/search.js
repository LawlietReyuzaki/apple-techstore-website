/**
 * Catalog search — an in-memory fuzzy index over catalog_items + catalog_categories.
 *
 * Typo-tolerant (Damerau-Levenshtein), prefix-aware ("huaw" → Huawei), synonym-aware
 * ("screen" → LCD panel), and it ranks in-stock items with images first. Rebuilt from the
 * catalog tables after every catalog rebuild and at most every 30 minutes otherwise.
 */
import { partPlural } from './classify.js';
import { bandLabel } from './rebuild.js';

const ITEM_FIELDS = `item_id, source_table, name, kind, brand, brand_slug, model, model_slug, part_type, part_type_slug,
  price, regular_price, stock, in_stock, url_path, main_image, image_count`;
const CAT_FIELDS = `path, type, heading, brand, brand_slug, model, model_slug, part_type, part_type_slug, price_band_slug,
  unique_count`;
const REFRESH_MS = 30 * 60 * 1000;
const TYPE_RANK = { brand: 3, part: 2.6, part_brand: 2.2, model: 1.8, phones_price: 1.2, brand_index: 0.5, part_index: 0.5 };

// Query-side synonyms: each alternative is OR-ed with the typed token.
const SYNONYMS = {
  screen: ['lcd', 'panel', 'display'], display: ['lcd', 'panel', 'screen'], panel: ['lcd', 'screen'], lcd: ['panel', 'screen'],
  battery: ['cell'], cell: ['battery'], charger: ['charging', 'adapter'], charging: ['charger'],
  glass: ['touch', 'digitizer'], touch: ['glass', 'digitizer'], digitizer: ['touch', 'glass'],
  cover: ['case', 'housing', 'back'], case: ['cover', 'housing'], housing: ['cover', 'case', 'back'],
  speaker: ['buzzer', 'ringer', 'loudspeaker'], buzzer: ['speaker', 'ringer'], ringer: ['speaker', 'buzzer'],
  mic: ['microphone'], microphone: ['mic'], earpiece: ['ear', 'receiver'], receiver: ['earpiece'],
  cam: ['camera'], camera: ['cam'], port: ['connector', 'jack'], connector: ['port', 'jack'],
  sim: ['tray'], tray: ['sim'], flex: ['cable', 'strip'], cable: ['flex', 'wire'],
  protector: ['glass', 'guard'], guard: ['protector'], iphone: ['apple'], apple: ['iphone'],
  mi: ['xiaomi', 'redmi'], redmi: ['xiaomi'], poco: ['xiaomi'], honor: ['huawei'], galaxy: ['samsung'], pixel: ['google'],
  mobile: ['phone'], phone: ['mobile'], laptop: ['notebook'], original: ['orignal', 'genuine'], orignal: ['original'],
  copy: ['compatible', 'aftermarket'], oled: ['amoled'], amoled: ['oled'],
};

// ── Tokenizer (shared by index and query) ─────────────────────────────────
export function tokenize(s) {
  const out = [];
  const seen = new Set();
  const push = (t) => { if (t && !seen.has(t)) { seen.add(t); out.push(t); } };
  String(s || '').toLowerCase()
    .replace(/[+]/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .forEach((raw) => {
      push(raw);
      // "iphone14pro" → iphone, 14, pro ; "a52s" → a, 52s (raw kept too)
      const parts = raw.match(/[a-z]+|[0-9]+[a-z]{1,2}(?![a-z])|[0-9]+/g) || [];
      if (parts.length > 1) parts.forEach(push);
    });
  return out;
}
const norm = (s) => tokenize(s).join(' ');

// Damerau-Levenshtein (optimal string alignment) with an early exit past `max`.
export function editDistance(a, b, max = 2) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev2 = new Array(lb + 1), prev = Array.from({ length: lb + 1 }, (_, j) => j), cur = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    const t = prev2; prev2 = prev; prev = cur; cur = t;
  }
  return prev[lb];
}
const maxDist = (len) => (len < 4 ? 0 : len < 7 ? 1 : 2);

// ── Index ─────────────────────────────────────────────────────────────────
export function buildIndex(items, cats) {
  const vocab = new Map();                       // token → Map(itemIdx → weight)
  const add = (tok, idx, w) => {
    let m = vocab.get(tok);
    if (!m) vocab.set(tok, (m = new Map()));
    if ((m.get(idx) || 0) < w) m.set(idx, w);
  };
  const docs = items.map((it, idx) => {
    const nameNorm = norm(it.name);
    tokenize(it.name).forEach((t) => add(t, idx, 1));
    tokenize(it.brand).forEach((t) => add(t, idx, 0.9));
    tokenize(it.model).forEach((t) => add(t, idx, 0.9));
    tokenize(it.part_type).forEach((t) => add(t, idx, 0.8));
    return { ...it, nameNorm, tokenCount: nameNorm.split(' ').length };
  });
  const tokenSet = new Set(vocab.keys());
  const catDocs = cats.map((c) => {
    const label = catLabel(c);
    const tokens = new Set([...tokenize(label), ...tokenize(c.heading)]);
    // singular forms too, so "battery" finds the "Batteries" category and "panel" finds "LCD Panels"
    for (const t of [...tokens]) {
      if (t.endsWith('ies')) tokens.add(t.slice(0, -3) + 'y');
      else if (t.endsWith('es') && t.length > 4) tokens.add(t.slice(0, -2));
      if (t.endsWith('s') && t.length > 3) tokens.add(t.slice(0, -1));
    }
    tokens.forEach((t) => tokenSet.add(t));
    return { ...c, label, labelNorm: norm(label), tokens };
  });
  return { docs, catDocs, vocab, tokenSet, tokenList: [...tokenSet], builtAt: Date.now() };
}

export function catLabel(c) {
  switch (c.type) {
    case 'brand': return c.brand;
    case 'model': return `${c.brand} ${c.model}`.trim();
    case 'part': return partPlural(c.part_type);
    case 'part_brand': return `${c.brand} ${partPlural(c.part_type)}`;
    case 'phones_price': return `Phones ${bandLabel(c.price_band_slug)}`;
    case 'brand_index': return 'All Brands';
    case 'part_index': return 'All Parts';
    default: return c.heading;
  }
}

// For one query token: every vocab token it can stand for, with a confidence 0..1.
function expandToken(index, tok) {
  const hits = new Map();                        // vocab token → confidence
  const consider = (v, conf) => { if ((hits.get(v) || 0) < conf) hits.set(v, conf); };
  const has = (t) => index.tokenSet.has(t);
  if (has(tok)) consider(tok, 1);
  for (const syn of SYNONYMS[tok] || []) if (has(syn)) consider(syn, 0.85);
  // singular / plural forms: batteries ↔ battery, panels ↔ panel, glass ↔ glasses
  const forms = [];
  if (tok.endsWith('ies')) forms.push(tok.slice(0, -3) + 'y');
  if (tok.endsWith('es')) forms.push(tok.slice(0, -2));
  if (tok.endsWith('s')) forms.push(tok.slice(0, -1));
  if (tok.endsWith('y')) forms.push(tok.slice(0, -1) + 'ies');
  forms.push(tok + 's', tok + 'es');
  for (const f of forms) if (f.length >= 2 && has(f)) consider(f, 0.9);
  const md = maxDist(tok.length);
  const numeric = /^\d+$/.test(tok);
  for (const v of index.tokenList) {
    if (v === tok) continue;
    if (v.startsWith(tok)) { consider(v, Math.max(0.55, 0.95 * tok.length / v.length)); continue; }
    if (md && !numeric) {                        // never "correct" a pure number (a52 must not become a53)
      const d = editDistance(tok, v, md);
      if (d <= md) consider(v, 0.7 - 0.2 * d);
    }
  }
  return hits;
}

// expansions: per query token, Map(vocabToken → conf). Returns per-token Map(itemIdx → score).
function collect(index, expansions) {
  return expansions.map((hits) => {
    const m = new Map();
    for (const [v, conf] of hits) {
      const posting = index.vocab.get(v);
      if (!posting) continue;
      for (const [idx, w] of posting) { const s = conf * w; if ((m.get(idx) || 0) < s) m.set(idx, s); }
    }
    return m;
  });
}

export function search(index, rawQuery, { limit = 8, offset = 0, full = false } = {}) {
  const q = String(rawQuery || '').replace(/[<>]/g, '').trim().slice(0, 80);
  const qNorm = norm(q);
  const tokens = tokenize(q);
  const empty = { q, corrected: null, relaxed: false, suggestions: [], categories: [], items: [], total: 0 };
  if (!tokens.length) return empty;

  // Single letters only count when they are all the user typed ("a" → brands starting with A);
  // tokens nothing in the catalog can stand for (e.g. "zzz9") are dropped rather than blocking results.
  const required = tokens.filter((t) => t.length >= 2 || /^\d$/.test(t));
  let useTokens = required.length ? required : tokens;
  let expansions = useTokens.map((t) => expandToken(index, t));
  let relaxed = false;
  if (required.length) {
    const keep = useTokens.map((_, i) => expansions[i].size > 0);
    if (keep.some((k) => !k) && keep.some((k) => k)) {
      relaxed = true;
      useTokens = useTokens.filter((_, i) => keep[i]);
      expansions = expansions.filter((_, i) => keep[i]);
    }
  }
  const per = collect(index, expansions);

  // Items: must match every token (relax to all-but-one when 3+ tokens and nothing matches)
  const rank = (minMatches) => {
    const scores = new Map();
    const counts = new Map();
    per.forEach((m) => { for (const [idx, s] of m) { scores.set(idx, (scores.get(idx) || 0) + s); counts.set(idx, (counts.get(idx) || 0) + 1); } });
    const out = [];
    for (const [idx, base] of scores) {
      if (counts.get(idx) < minMatches) continue;
      const d = index.docs[idx];
      let s = base;
      if (d.nameNorm === qNorm) s += 2;
      else if (d.nameNorm.startsWith(qNorm)) s += 1;
      else if (d.nameNorm.includes(qNorm)) s += 0.6;
      if (d.in_stock) s += 0.35;
      if (d.image_count > 0) s += 0.2;
      s -= 0.02 * Math.max(0, d.tokenCount - useTokens.length);
      out.push([idx, s]);
    }
    out.sort((a, b) => b[1] - a[1] || index.docs[a[0]].name.localeCompare(index.docs[b[0]].name));
    return out;
  };
  let ranked = rank(useTokens.length);
  if (!ranked.length && useTokens.length >= 3) { ranked = rank(useTokens.length - 1); relaxed = relaxed || ranked.length > 0; }

  // Categories: every token must hit the label/heading tokens (via the same expansions)
  const catHits = [];
  for (const c of index.catDocs) {
    let s = 0, ok = true;
    for (const hits of expansions) {
      let best = 0;
      for (const [v, conf] of hits) if (c.tokens.has(v) && conf > best) best = conf;
      if (!best) { ok = false; break; }
      s += best;
    }
    if (!ok) continue;
    s += TYPE_RANK[c.type] || 1;
    s += Math.min(1, Math.log10(Math.max(1, c.unique_count)) / 2);
    if (c.labelNorm === qNorm) s += 2; else if (c.labelNorm.startsWith(qNorm)) s += 0.8;
    catHits.push([c, s]);
  }
  catHits.sort((a, b) => b[1] - a[1] || a[0].label.localeCompare(b[0].label));
  const categories = catHits.slice(0, full ? 12 : 6).map(([c]) => ({
    path: c.path, name: c.label, type: c.type, count: c.unique_count,
  }));

  // "Did you mean": rebuild the query word by word from each word's best non-prefix expansion
  let corrected = null;
  const words = q.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim().split(' ').filter(Boolean);
  let changed = false;
  const fixed = words.map((w) => {
    if (w.length < 2 || index.tokenSet.has(w)) return w;
    const i = useTokens.indexOf(w);
    const hits = i >= 0 ? expansions[i] : expandToken(index, w);
    let best = null, bc = 0;
    for (const [v, conf] of hits) if (conf > bc && !v.startsWith(w)) { best = v; bc = conf; }
    if (best) changed = true;
    return best || w;
  });
  if (changed && ranked.length) corrected = fixed.join(' ');

  // Three guesses: category labels first, then distinct product names
  const suggestions = [];
  const seen = new Set();
  const addSug = (text, path) => {
    const k = text.toLowerCase();
    if (!seen.has(k) && suggestions.length < 3) { seen.add(k); suggestions.push({ text, path }); }
  };
  catHits.slice(0, 3).forEach(([c]) => addSug(c.label, c.path));
  for (const [idx] of ranked) { if (suggestions.length >= 3) break; addSug(index.docs[idx].name, index.docs[idx].url_path); }

  // The same product listed in two tables appears once in search (the better-ranked copy wins)
  const seenNames = new Set();
  ranked = ranked.filter(([idx]) => { const k = index.docs[idx].nameNorm; if (seenNames.has(k)) return false; seenNames.add(k); return true; });
  const total = ranked.length;
  const lim = Math.min(parseInt(limit) > 0 ? parseInt(limit) : 8, 96);
  const off = parseInt(offset) > 0 ? parseInt(offset) : 0;
  const items = ranked.slice(off, off + lim).map(([idx]) => {
    const d = index.docs[idx];
    return {
      item_id: d.item_id, source_table: d.source_table, name: d.name, brand: d.brand, kind: d.kind,
      part_type: d.part_type, price: d.price, regular_price: d.regular_price, stock: d.stock, in_stock: d.in_stock,
      url_path: d.url_path, main_image: d.main_image,
    };
  });
  return { q, corrected, relaxed, suggestions, categories, items, total };
}

// ── Lifecycle (DB-backed) ─────────────────────────────────────────────────
let index = null, building = null, stale = true;
export const markSearchStale = () => { stale = true; };

async function load(pool) {
  const [{ rows: items }, { rows: cats }] = await Promise.all([
    pool.query(`SELECT ${ITEM_FIELDS} FROM catalog_items`),
    pool.query(`SELECT ${CAT_FIELDS} FROM catalog_categories`),
  ]);
  return buildIndex(items, cats);
}

export async function getSearchIndex(pool) {
  const old = index && Date.now() - index.builtAt > REFRESH_MS;
  if (index && !stale && !old) return index;
  if (!building) {
    building = load(pool).then((ix) => { index = ix; stale = false; return ix; }).finally(() => { building = null; });
  }
  if (index) { building.catch((e) => console.error('[search] refresh failed:', e.message)); return index; }  // serve old, refresh in background
  return building;
}
