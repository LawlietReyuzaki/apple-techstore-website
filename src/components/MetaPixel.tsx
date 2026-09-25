import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackInitiateCheckout, trackMeta, trackViewContent } from "@/lib/metaPixel";

/** Fires PageView on every client-side route change (the base code already covers the first load). */
export function MetaPixelRouteTracker() {
  const { pathname, search } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    trackMeta("PageView");
  }, [pathname, search]);
  return null;
}

/** Render on a product page to fire ViewContent once per product. */
export function TrackViewContent({ id, name, price }: { id: string; name: string; price: unknown }) {
  useEffect(() => { if (id) trackViewContent(id, name, price); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Render on the checkout page to fire InitiateCheckout once when it opens. */
export function TrackInitiateCheckout({ items, total }: { items: { id: string; quantity: number }[]; total: number }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !items.length) return;
    fired.current = true;
    trackInitiateCheckout(items, total);
  }, [items, total]);
  return null;
}
