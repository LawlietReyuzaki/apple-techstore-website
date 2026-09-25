/**
 * Meta Pixel helpers. The base code lives in index.html (fires the first PageView);
 * everything here only calls window.fbq when it exists, so the app never breaks if the
 * pixel script is blocked.
 *
 * content_ids are the same ids as the Meta catalog feed (/meta-feed.csv "id" column):
 * the product / spare part / shop item UUID.
 */
declare global {
  interface Window { fbq?: (...args: any[]) => void }
}

export type MetaEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search";

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

export function trackMeta(event: MetaEvent, data?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;
    if (data) window.fbq("track", event, data); else window.fbq("track", event);
  } catch { /* never let analytics break the page */ }
}

/** Product page opened. Pass the price the customer actually pays (sale price when discounted). */
export function trackViewContent(id: string, name: string, price: unknown) {
  trackMeta("ViewContent", { content_ids: [String(id)], content_type: "product", content_name: name, value: num(price), currency: "PKR" });
}

export function trackAddToCart(id: string, price: unknown, quantity = 1) {
  trackMeta("AddToCart", { content_ids: [String(id)], content_type: "product", value: num(price) * Math.max(1, quantity), currency: "PKR" });
}

interface LineItem { id: string; quantity: number }
export function trackInitiateCheckout(items: LineItem[], total: unknown) {
  trackMeta("InitiateCheckout", {
    content_ids: [...new Set(items.map((i) => String(i.id)))], content_type: "product",
    num_items: items.reduce((n, i) => n + (i.quantity || 1), 0), value: num(total), currency: "PKR",
  });
}

const PURCHASED_KEY = "ats_meta_purchased";
/** Order confirmed — fires once per order id even if the page is refreshed. */
export function trackPurchase(orderId: string, items: LineItem[], total: unknown) {
  if (!orderId) return;
  let done: string[] = [];
  try { done = JSON.parse(localStorage.getItem(PURCHASED_KEY) || "[]"); } catch { /* ignore */ }
  if (done.includes(orderId)) return;
  trackMeta("Purchase", {
    content_ids: [...new Set(items.map((i) => String(i.id)))], content_type: "product",
    num_items: items.reduce((n, i) => n + (i.quantity || 1), 0), value: num(total), currency: "PKR",
    order_id: orderId,
  });
  try { localStorage.setItem(PURCHASED_KEY, JSON.stringify([...done, orderId].slice(-50))); } catch { /* ignore */ }
}

export function trackSearch(query: string) {
  const q = query.trim();
  if (q) trackMeta("Search", { search_string: q });
}
