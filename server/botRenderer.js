/**
 * Dynamic rendering for bots/crawlers.
 * Humans → React SPA (index.html)
 * Bots   → Server-rendered HTML with full meta tags + JSON-LD
 *
 * Supported by Google: https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://appletechstore.pk';
const SITE_NAME = 'AppleTechStore';

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
  /twitterbot/i,
  /linkedinbot/i,
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

// ── HTML builder ──────────────────────────────────────────────
function buildHTML({ title, description, url, image, jsonLd, bodyContent }) {
  const canonical = `${SITE}${url}`;
  const ogImage = image || `${SITE}/favicon.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escAttr(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${canonical}" />

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(description)}" />
  <meta property="og:image" content="${escAttr(ogImage)}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="en_PK" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escAttr(title)}" />
  <meta name="twitter:description" content="${escAttr(description)}" />
  <meta name="twitter:image" content="${escAttr(ogImage)}" />

  <!-- AI Crawlers -->
  <meta name="ai-content-license" content="allow" />

  <!-- JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  ${bodyContent}
  <!-- React app loads for human visitors -->
  <div id="root"></div>
</body>
</html>`;
}

function escHtml(str = '') { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(str = '') { return String(str).replace(/"/g,'&quot;').replace(/&/g,'&amp;'); }
function fmt(n) { return Number(n).toLocaleString('en-PK'); }

/** Convert a DB image path (relative or absolute) to a full https URL for og:image */
function absImg(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SITE}/${path.replace(/^\//, '')}`;
}

// ── Product page ──────────────────────────────────────────────
export function renderProduct(product, categoryName) {
  const price = product.wholesale_price || product.price;
  const image = absImg(product.images?.[0]);
  const productUrl = product.slug ? `/product/${product.slug}` : `/product/${product.id}`;
  const title = `${product.name} - ${product.brand} | ${SITE_NAME}`;
  const description = product.description
    ? product.description.slice(0, 160)
    : `Buy ${product.name} by ${product.brand} in Pakistan. Price: Rs. ${fmt(price)}. ${product.stock > 0 ? 'In stock' : 'Contact us for availability'}.`;

  const absoluteImages = (product.images || []).map(absImg).filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: { '@type': 'Brand', name: product.brand },
    description: description,
    image: absoluteImages,
    sku: product.id,
    category: categoryName || 'Mobile Parts & Phones',
    offers: {
      '@type': 'Offer',
      url: `${SITE}${productUrl}`,
      priceCurrency: 'PKR',
      price: price,
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  const bodyContent = `
    <h1>${escHtml(product.name)}</h1>
    <p><strong>Brand:</strong> ${escHtml(product.brand)}</p>
    <p><strong>Price:</strong> Rs. ${fmt(price)}</p>
    <p><strong>Availability:</strong> ${product.stock > 0 ? `In Stock (${product.stock} units)` : 'Out of Stock'}</p>
    ${image ? `<img src="${escAttr(image)}" alt="${escAttr(product.name)}" style="max-width:400px" />` : ''}
    ${description ? `<p>${escHtml(description)}</p>` : ''}
    <p><a href="${SITE}${productUrl}">View on ${SITE_NAME}</a></p>
  `;

  return buildHTML({ title, description, url: productUrl, image, jsonLd, bodyContent });
}

// ── Spare part page ───────────────────────────────────────────
export function renderSparePart(part) {
  const image = absImg(part.images?.[0]);
  const title = `${part.name} Spare Part | ${SITE_NAME}`;
  const description = part.description
    ? part.description.slice(0, 160)
    : `Buy ${part.name} spare part in Pakistan. Price: Rs. ${fmt(part.price)}. ${part.stock > 0 ? 'In stock' : 'Contact us'}.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: part.name,
    description,
    image: (part.images || []).map(absImg).filter(Boolean),
    sku: part.id,
    category: 'Mobile Spare Parts',
    offers: {
      '@type': 'Offer',
      url: `${SITE}/spare-part/${part.id}`,
      priceCurrency: 'PKR',
      price: part.price,
      availability: part.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  const bodyContent = `
    <h1>${escHtml(part.name)} - Mobile Spare Part</h1>
    <p><strong>Price:</strong> Rs. ${fmt(part.price)}</p>
    <p><strong>Availability:</strong> ${part.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
    ${image ? `<img src="${escAttr(image)}" alt="${escAttr(part.name)}" style="max-width:400px" />` : ''}
    ${description ? `<p>${escHtml(description)}</p>` : ''}
  `;

  return buildHTML({ title, description, url: `/spare-part/${part.id}`, image, jsonLd, bodyContent });
}

// ── Shop item page ────────────────────────────────────────────
export function renderShopItem(item) {
  const image = absImg(item.images?.[0]);
  const price = item.sale_price || item.price;
  const title = `${item.name} | ${SITE_NAME}`;
  const description = item.description
    ? item.description.slice(0, 160)
    : `Buy ${item.name} in Pakistan. Price: Rs. ${fmt(price)}. Shop at ${SITE_NAME}.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description,
    image: (item.images || []).map(absImg).filter(Boolean),
    sku: item.id,
    offers: {
      '@type': 'Offer',
      url: `${SITE}/shop-item/${item.id}`,
      priceCurrency: 'PKR',
      price,
      availability: item.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  const bodyContent = `
    <h1>${escHtml(item.name)}</h1>
    <p><strong>Price:</strong> Rs. ${fmt(price)}</p>
    <p><strong>Availability:</strong> ${item.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
    ${image ? `<img src="${escAttr(image)}" alt="${escAttr(item.name)}" style="max-width:400px" />` : ''}
    ${description ? `<p>${escHtml(description)}</p>` : ''}
  `;

  return buildHTML({ title, description, url: `/shop-item/${item.id}`, image, jsonLd, bodyContent });
}
