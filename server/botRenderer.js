/**
 * Server-side page metadata.
 *   Bots/crawlers → a full server-rendered HTML page (buildHTML)
 *   Everyone else → the real React index.html with per-page <title>, description,
 *                   canonical, Open Graph/Twitter tags and JSON-LD injected, plus a
 *                   lightweight content summary in #root that React replaces on mount.
 * So crawlers that don't run JavaScript (WhatsApp, Facebook, curl, SEO tools) always
 * see the correct page, and slow connections see the product before the app loads.
 *
 * Dynamic rendering is supported by Google:
 * https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering
 */

const SITE = 'https://appletechstore.pk';
const SITE_NAME = 'AppleTechStore';
const DEFAULT_OG_IMAGE = `${SITE}/og-image.jpg`;

// ── Bot detection ─────────────────────────────────────────────
const BOT_UA_PATTERNS = [
  /googlebot/i,
  /google-extended/i,       // Gemini AI crawler
  /gptbot/i,                // ChatGPT crawler
  /chatgpt-user/i,
  /anthropic-ai/i,          // Claude crawler
  /claudebot/i,
  /perplexitybot/i,
  /bingbot/i,
  /slurp/i,                 // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /facebookexternalhit/i,
  /facebookcatalog/i,
  /twitterbot/i,
  /linkedinbot/i,
  // Link-preview crawlers — without these, shared links show a blank card
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /skypeuripreview/i,
  /pinterest/i,
  /redditbot/i,
  /embedly/i,
  /viber/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /yandexbot/i,
  /ccbot/i,                 // Common Crawl (used by many AI trainers)
  /ia_archiver/i,
  /rogerbot/i,
  /screaming frog/i,
];

export function isBot(userAgent = '') {
  return BOT_UA_PATTERNS.some(p => p.test(userAgent));
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// `&` must be escaped first, otherwise `&quot;` is turned into `&amp;quot;`
function escAttr(str = '') {
  return escHtml(str).replace(/"/g, '&quot;');
}
// Keeps a product name like `</script>` from closing the JSON-LD block
function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function trim160(s) {
  const clean = String(s || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 160) return clean;
  return clean.slice(0, 157).replace(/\s+\S*$/, '') + '…';
}
/** Convert a DB image path (relative or absolute) to a full https URL */
function absImg(path) {
  if (!path || !String(path).trim()) return null;
  if (String(path).startsWith('http')) return path;
  return `${SITE}/${String(path).replace(/^\//, '')}`;
}
const imagesOf = (item) => (item.images || []).map(absImg).filter(Boolean);
const inStockText = (stock) => (Number(stock) > 0 ? 'In stock' : 'Contact us for availability');

function conditionOf(name = '', categoryName = '') {
  if (/\b(used|refurbished|pre-owned)\b/i.test(name)) return 'https://schema.org/UsedCondition';
  // The phones category mixes new and used stock — omit rather than guess wrong
  if (/phone/i.test(categoryName)) return null;
  return 'https://schema.org/NewCondition';
}

function breadcrumbLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE}${c.url}`,
    })),
  };
}

function productLd({ name, brand, description, images, sku, category, url, price, stock, condition }) {
  const offer = {
    '@type': 'Offer',
    url: `${SITE}${url}`,
    priceCurrency: 'PKR',
    price: Number(price || 0).toFixed(2),
    availability: Number(stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    seller: { '@type': 'Organization', name: SITE_NAME },
  };
  if (condition) offer.itemCondition = condition;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images,
    sku,
    offers: offer,
  };
  if (brand) ld.brand = { '@type': 'Brand', name: brand };
  if (category) ld.category = category;
  return ld;
}

/** Visible, crawlable content. Uses inherited colours so it reads in light and dark themes. */
function summaryHtml({ name, price, stock, image, description, crumbs }) {
  const trail = crumbs
    .map((c, i) => (i === crumbs.length - 1
      ? `<span>${escHtml(c.name)}</span>`
      : `<a href="${escAttr(c.url)}" style="color:inherit">${escHtml(c.name)}</a>`))
    .join(' &rsaquo; ');
  return `
<main style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:760px;margin:32px auto;padding:0 16px;line-height:1.5">
  <nav aria-label="Breadcrumb" style="font-size:13px;opacity:.7;margin-bottom:12px">${trail}</nav>
  ${image ? `<img src="${escAttr(image)}" alt="${escAttr(name)}" width="320" height="320" style="max-width:100%;height:auto;object-fit:contain;border-radius:12px" />` : ''}
  <h1 style="font-size:24px;margin:16px 0 4px">${escHtml(name)}</h1>
  <p style="font-size:22px;font-weight:700;margin:4px 0">Rs. ${fmt(price)}</p>
  <p style="color:#16a34a;margin:4px 0">${Number(stock) > 0 ? 'In stock' : 'Out of stock — contact us'}</p>
  ${description ? `<p style="opacity:.8">${escHtml(String(description).slice(0, 400))}</p>` : ''}
  <p style="opacity:.8">Cash on Delivery · JazzCash · Easypaisa · Delivery across Pakistan</p>
</main>`;
}

// ── Per-page metadata ─────────────────────────────────────────
export function productMeta(product) {
  const wholesale = Number(product.wholesale_price);
  const regular = Number(product.price);
  const price = wholesale && wholesale < regular ? wholesale : regular;
  const url = product.slug ? `/product/${product.slug}` : `/product/${product.id}`;
  const images = imagesOf(product);
  const categoryName = product.category_name || '';
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Shop', url: '/shop' },
    ...(categoryName
      ? [{ name: categoryName, url: product.category_slug ? `/shop?category=${product.category_slug}` : '/shop' }]
      : []),
    { name: product.name, url },
  ];
  const brandPart = product.brand ? ` by ${product.brand}` : '';
  const description = trim160(
    `Buy ${product.name}${brandPart} at Rs. ${fmt(price)} in Pakistan. ${inStockText(product.stock)}. ` +
    `Cash on Delivery, JazzCash & Easypaisa. Fast delivery nationwide.`
  );
  return {
    title: `${product.name} Price in Pakistan | ${SITE_NAME}`,
    description,
    url,
    image: images[0] || DEFAULT_OG_IMAGE,
    ogType: 'product',
    jsonLd: [
      productLd({
        name: product.name, brand: product.brand,
        description: trim160(product.description || description),
        images, sku: String(product.id).slice(0, 8), category: categoryName || undefined,
        url, price, stock: product.stock, condition: conditionOf(product.name, categoryName),
      }),
      breadcrumbLd(crumbs),
    ],
    bodyContent: summaryHtml({
      name: product.name, price, stock: product.stock, image: images[0],
      description: product.description, crumbs,
    }),
  };
}

export function sparePartMeta(part) {
  const url = part.slug ? `/spare-part/${part.slug}` : `/spare-part/${part.id}`;
  const images = imagesOf(part);
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Spare Parts', url: '/spare-parts' },
    { name: part.name, url },
  ];
  const description = trim160(
    `Buy ${part.name} at Rs. ${fmt(part.price)} in Pakistan. ${inStockText(part.stock)}. ` +
    `Quality tested before dispatch. Cash on Delivery across Pakistan.`
  );
  return {
    title: `${part.name} Price in Pakistan | ${SITE_NAME}`,
    description,
    url,
    image: images[0] || DEFAULT_OG_IMAGE,
    ogType: 'product',
    jsonLd: [
      productLd({
        name: part.name, description: trim160(part.description || description), images,
        sku: String(part.id).slice(0, 8), category: 'Mobile Spare Parts', url,
        price: part.price, stock: part.stock, condition: 'https://schema.org/NewCondition',
      }),
      breadcrumbLd(crumbs),
    ],
    bodyContent: summaryHtml({
      name: part.name, price: part.price, stock: part.stock, image: images[0],
      description: part.description, crumbs,
    }),
  };
}

export function shopItemMeta(item) {
  const sale = Number(item.sale_price);
  const regular = Number(item.price);
  const price = sale && sale < regular ? sale : regular;
  const url = `/shop-item/${item.id}`;
  const images = imagesOf(item);
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Shop', url: '/shop' },
    { name: item.name, url },
  ];
  const description = trim160(
    `Buy ${item.name} at Rs. ${fmt(price)} in Pakistan. ${inStockText(item.stock)}. ` +
    `Cash on Delivery, JazzCash & Easypaisa. Fast delivery nationwide.`
  );
  return {
    title: `${item.name} Price in Pakistan | ${SITE_NAME}`,
    description,
    url,
    image: images[0] || DEFAULT_OG_IMAGE,
    ogType: 'product',
    jsonLd: [
      productLd({
        name: item.name, description: trim160(item.description || description), images,
        sku: String(item.id).slice(0, 8), url, price, stock: item.stock,
        condition: conditionOf(item.name),
      }),
      breadcrumbLd(crumbs),
    ],
    bodyContent: summaryHtml({
      name: item.name, price, stock: item.stock, image: images[0],
      description: item.description, crumbs,
    }),
  };
}

// ── Output: full page for bots ────────────────────────────────
export function buildHTML(m) {
  const canonical = `${SITE}${m.url}`;
  const image = m.image || DEFAULT_OG_IMAGE;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(m.title)}</title>
  <meta name="description" content="${escAttr(m.description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${canonical}" />

  <meta property="og:type" content="${m.ogType || 'website'}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${escAttr(m.title)}" />
  <meta property="og:description" content="${escAttr(m.description)}" />
  <meta property="og:image" content="${escAttr(image)}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="en_PK" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escAttr(m.title)}" />
  <meta name="twitter:description" content="${escAttr(m.description)}" />
  <meta name="twitter:image" content="${escAttr(image)}" />

  <meta name="ai-content-license" content="allow" />
${(m.jsonLd || []).map(o => `  <script type="application/ld+json">${safeJson(o)}</script>`).join('\n')}
</head>
<body>
  ${m.bodyContent || ''}
  <div id="root"></div>
</body>
</html>`;
}

// Kept for backwards compatibility with older imports
export const renderProduct = (product, categoryName) =>
  buildHTML(productMeta({ ...product, category_name: product.category_name || categoryName }));
export const renderSparePart = (part) => buildHTML(sparePartMeta(part));
export const renderShopItem = (item) => buildHTML(shopItemMeta(item));

export function notFoundHtml() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<title>Page not found | ${SITE_NAME}</title>
<meta name="robots" content="noindex" />
</head><body><h1>Page not found</h1><p><a href="${SITE}/shop">Browse the shop</a></p></body></html>`;
}

// ── Output: inject into the real React index.html ─────────────
// Replacements use functions so a `$` in a product name is never read as a
// replacement pattern ($&, $1 …).
function setTag(html, re, tag) {
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => `${tag}\n</head>`);
}
function stripJsonLd(html) {
  return html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');
}

export function injectMeta(indexHtml, m) {
  const canonical = `${SITE}${m.url}`;
  const title = escAttr(m.title);
  const desc = escAttr(m.description);
  const image = escAttr(m.image || DEFAULT_OG_IMAGE);
  let h = indexHtml.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escHtml(m.title)}</title>`);
  h = setTag(h, /<meta\s+name="title"[^>]*>/i, `<meta name="title" content="${title}" />`);
  h = setTag(h, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${desc}" />`);
  h = setTag(h, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  h = setTag(h, /<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="${m.ogType || 'website'}" />`);
  h = setTag(h, /<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}" />`);
  h = setTag(h, /<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`);
  h = setTag(h, /<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${desc}" />`);
  h = setTag(h, /<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${image}" />`);
  h = setTag(h, /<meta\s+name="twitter:url"[^>]*>/i, `<meta name="twitter:url" content="${canonical}" />`);
  h = setTag(h, /<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`);
  h = setTag(h, /<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${desc}" />`);
  h = setTag(h, /<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${image}" />`);
  // Page-specific structured data replaces the homepage-only blocks (FAQ, business info)
  h = stripJsonLd(h);
  const ld = (m.jsonLd || []).map(o => `<script type="application/ld+json">${safeJson(o)}</script>`).join('\n');
  h = h.replace('</head>', () => `${ld}\n</head>`);
  if (m.bodyContent) h = h.replace(/<div id="root">\s*<\/div>/, () => `<div id="root">${m.bodyContent}</div>`);
  return h;
}

/**
 * For every other route: a self-referencing canonical (instead of the homepage),
 * homepage-only JSON-LD removed, and noindex on private pages.
 * Filter/sort query strings are dropped; only ?category= on /shop is kept.
 */
export function injectBasic(indexHtml, { path, search = '', noindex = false }) {
  const cleanPath = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const category = new URLSearchParams(search).get('category');
  const url = cleanPath === '/shop' && category && category !== 'all'
    ? `/shop?category=${encodeURIComponent(category)}`
    : cleanPath;
  const canonical = `${SITE}${url}`;
  let h = setTag(indexHtml, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  h = setTag(h, /<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}" />`);
  h = setTag(h, /<meta\s+name="twitter:url"[^>]*>/i, `<meta name="twitter:url" content="${canonical}" />`);
  if (cleanPath !== '/') h = stripJsonLd(h);
  if (noindex) h = setTag(h, /<meta\s+name="robots"[^>]*>/i, `<meta name="robots" content="noindex, nofollow" />`);
  return h;
}
