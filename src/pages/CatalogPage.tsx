import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, SlidersHorizontal } from "lucide-react";
import { ShopItemCard } from "@/components/ShopItemCard";
import { ProductCartButton } from "@/components/ProductCartButton";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import NotFound from "./NotFound";

interface CatalogItem {
  item_id: string;
  source_table: "products" | "spare_parts" | "shop_items";
  name: string;
  brand: string;
  price: number | null;
  regular_price: number | null;
  stock: number | null;
  url_path: string;
  main_image: string | null;
}
interface CatalogLink { path: string; name: string; count: number; grp: string | null }
interface Facet { slug: string; name: string; count: number }
interface CatalogPageData {
  category: {
    path: string; type: string; title: string; heading: string; description: string;
    unique_count: number; item_count: number; indexable: boolean; brand: string | null;
  };
  breadcrumbs: { name: string; url: string }[];
  links: CatalogLink[];
  facets: { parts: Facet[]; brands: Facet[]; prices: Facet[] };
  items: CatalogItem[];
  total: number;
  pageSize: number;
}

const TYPE_MAP = { products: "product", spare_parts: "spare_part", shop_items: "shop_item" } as const;
const SORTS = [
  { value: "default", label: "Recommended" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
];
const GROUP_PREVIEW = 30;

// Catalog rows → the shape ShopItemCard expects (links go to the item's existing URL)
function toCard(i: CatalogItem) {
  const onSale = i.regular_price != null && i.price != null && i.regular_price > i.price;
  return {
    id: i.item_id,
    name: i.name,
    description: null,
    price: onSale ? i.regular_price! : i.price ?? 0,
    sale_price: onSale ? i.price : null,
    stock: i.stock,
    images: i.main_image ? [i.main_image] : [],
    featured: false,
    condition: null,
    shop_brands: i.brand ? { id: i.brand, name: i.brand } : null,
    _type: TYPE_MAP[i.source_table],
    slug: i.url_path.split("/").pop() || null,
  };
}

function Chip({ to, active, children, onClick }: { to?: string; active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  const cls = cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors border",
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-muted/60 text-foreground border-border/50 hover:bg-muted hover:border-primary/40"
  );
  return to ? <Link to={to} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

function LinkGroups({ links, isIndex }: { links: CatalogLink[]; isIndex: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const m = new Map<string, CatalogLink[]>();
    for (const l of links) {
      const g = l.grp || "";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(l);
    }
    return [...m.entries()];
  }, [links]);
  if (!links.length) return null;

  if (isIndex) {
    return (
      <div className="space-y-8">
        {groups.map(([g, ls]) => (
          <section key={g}>
            {g && <h2 className="text-lg font-semibold mb-3 text-foreground">{g}</h2>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {ls.map((l) => (
                <Link key={l.path} to={l.path}
                  className="rounded-xl border border-border/50 bg-card/80 p-4 hover:border-primary/40 hover:shadow-md transition-all">
                  <div className="font-semibold text-foreground line-clamp-2">{l.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{l.count.toLocaleString()} products</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([g, ls]) => {
        const expanded = open[g] || ls.length <= GROUP_PREVIEW;
        const shown = expanded ? ls : ls.slice(0, GROUP_PREVIEW);
        return (
          <div key={g}>
            {g && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g}</h2>}
            <div className="flex flex-wrap gap-2">
              {shown.map((l) => (
                <Chip key={l.path} to={l.path}>
                  {l.name} <span className="text-xs opacity-60">({l.count})</span>
                </Chip>
              ))}
              {!expanded && (
                <Chip onClick={() => setOpen((o) => ({ ...o, [g]: true }))}>+ {ls.length - GROUP_PREVIEW} more</Chip>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CatalogPage() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const filters = {
    part: params.get("part") || "",
    brand: params.get("brand") || "",
    price: params.get("price") || "",
    sort: params.get("sort") || "default",
  };

  const query = useInfiniteQuery({
    queryKey: ["catalog-page", path, filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ path, ...filters, offset: String(pageParam) });
      const res = await fetch(`/api/catalog/page?${qs}`);
      if (res.status === 404) throw Object.assign(new Error("not found"), { status: 404 });
      if (!res.ok) throw new Error("Failed to load");
      return (await res.json()) as CatalogPageData;
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    retry: (n, err: any) => err?.status !== 404 && n < 2,
    staleTime: 5 * 60 * 1000,
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || next.get(key) === value) next.delete(key); else next.set(key, value);
    if (key === "sort" && value === "default") next.delete("sort");
    setParams(next, { replace: true });
  };

  if ((query.error as any)?.status === 404) return <NotFound />;

  const first = query.data?.pages[0];
  const cat = first?.category;
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const isIndex = !!cat && cat.type.endsWith("_index");
  const facets = first?.facets;
  const hasFilters = !!(filters.part || filters.brand || filters.price);

  return (
    <div className="min-h-screen bg-background">
      {cat && (
        <PageSEO title={cat.title} description={cat.description} url={cat.path} noindex={!cat.indexable} />
      )}

      <header className="bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">AppleTechStore</Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
              <Link to="/shop" className="text-muted-foreground hover:text-foreground">Shop</Link>
              <Link to="/brands" className={path.startsWith("/brands") ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Shop by Brand</Link>
              <Link to="/parts" className={path.startsWith("/parts") ? "text-primary" : "text-muted-foreground hover:text-foreground"}>Shop by Part</Link>
              <Link to="/book-repair" className="text-muted-foreground hover:text-foreground">Repair</Link>
            </nav>
            <ProductCartButton />
          </div>
        </div>
        <nav className="md:hidden container mx-auto px-4 pb-3 flex gap-4 text-sm overflow-x-auto">
          <Link to="/shop" className="text-muted-foreground whitespace-nowrap">Shop</Link>
          <Link to="/brands" className={cn("whitespace-nowrap", path.startsWith("/brands") ? "text-primary" : "text-muted-foreground")}>Brands</Link>
          <Link to="/parts" className={cn("whitespace-nowrap", path.startsWith("/parts") ? "text-primary" : "text-muted-foreground")}>Parts</Link>
          <Link to="/phones/price/25000-to-49999" className={cn("whitespace-nowrap", path.startsWith("/phones/price") ? "text-primary" : "text-muted-foreground")}>Phones by Price</Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-4">
          {(first?.breadcrumbs ?? [{ name: "Home", url: "/" }]).map((c, i, a) => (
            <span key={c.url} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {i === a.length - 1 ? <span className="text-foreground">{c.name}</span> : <Link to={c.url} className="hover:text-primary">{c.name}</Link>}
            </span>
          ))}
        </nav>

        {query.isLoading || !cat ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-6">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{cat.heading}</h1>
            <p className="text-muted-foreground mt-2 max-w-3xl">{cat.description}</p>
            {!isIndex && (
              <p className="text-sm text-muted-foreground mt-1">
                {first.total.toLocaleString()} listing{first.total === 1 ? "" : "s"}{hasFilters ? " match your filters" : ""}
              </p>
            )}

            <div className="mt-6">
              <LinkGroups links={first.links} isIndex={isIndex} />
            </div>

            {!isIndex && (
              <>
                {/* Filters */}
                {facets && (facets.parts.length > 1 || facets.brands.length > 1 || facets.prices.length > 1 || hasFilters) && (
                  <div className="mt-8 rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <SlidersHorizontal className="h-4 w-4" /> Filter
                      </div>
                      <div className="flex items-center gap-2">
                        {hasFilters && (
                          <Button variant="ghost" size="sm" onClick={() => setParams(filters.sort !== "default" ? { sort: filters.sort } : {}, { replace: true })}>
                            Clear filters
                          </Button>
                        )}
                        <select
                          aria-label="Sort"
                          value={filters.sort}
                          onChange={(e) => setFilter("sort", e.target.value)}
                          className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                        >
                          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {[
                      { key: "part", label: "Part type", list: facets.parts },
                      { key: "brand", label: "Brand", list: facets.brands },
                      { key: "price", label: "Price", list: facets.prices },
                    ].filter((f) => f.list.length > 1 || (filters as any)[f.key]).map((f) => (
                      <div key={f.key} className="flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground w-20 shrink-0">{f.label}</span>
                        {f.list.map((o) => (
                          <Chip key={o.slug} active={(filters as any)[f.key] === o.slug} onClick={() => setFilter(f.key, o.slug)}>
                            {o.name} <span className="text-xs opacity-60">({o.count})</span>
                          </Chip>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Items */}
                {items.length === 0 ? (
                  <p className="mt-10 text-center text-muted-foreground">No products match these filters.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 mt-6">
                    {items.map((i) => <ShopItemCard key={`${i.source_table}:${i.item_id}`} item={toCard(i)} />)}
                  </div>
                )}
                {query.hasNextPage && (
                  <div className="flex justify-center mt-8">
                    <Button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} size="lg" variant="outline">
                      {query.isFetchingNextPage ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> :
                        `Load more (${(first.total - items.length).toLocaleString()} left)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
        {query.isError && (query.error as any)?.status !== 404 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Couldn't load this page right now.</p>
            <Button onClick={() => query.refetch()}>Try again</Button>
          </div>
        )}
      </main>
      <WhatsAppFloatingButton />
    </div>
  );
}
