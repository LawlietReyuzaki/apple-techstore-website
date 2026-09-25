import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { ShopItemCard } from "@/components/ShopItemCard";
import { StoreHeader } from "@/components/StoreHeader";
import { CatalogSidebar, MobileSidebar, FilterKey, SidebarFilters, SidebarTree } from "@/components/CatalogSidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toCard, CatalogItem } from "@/lib/catalogCard";
import NotFound from "./NotFound";

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

const SORTS = [
  { value: "default", label: "Recommended" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
];
const GROUP_PREVIEW = 12;
const GROUPS_PREVIEW = 8;
const FILTER_KEYS: FilterKey[] = ["part", "brand", "price", "stock"];

function Chip({ to, children, onClick }: { to?: string; children: React.ReactNode; onClick?: () => void }) {
  const cls = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border bg-muted/60 text-foreground border-border/50 hover:bg-muted hover:border-primary/40 transition-colors";
  return to ? <Link to={to} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

function LinkGroups({ links, isIndex, brand }: { links: CatalogLink[]; isIndex: boolean; brand?: string | null }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [allGroups, setAllGroups] = useState(false);
  // "Samsung Galaxy A01" → "Galaxy A01" on the Samsung page: the brand is already in the heading
  const label = (name: string) => (brand && name.startsWith(brand + " ") ? name.slice(brand.length + 1) : name);
  const groups = useMemo(() => {
    const m = new Map<string, CatalogLink[]>();
    for (const l of links) { const g = l.grp || ""; if (!m.has(g)) m.set(g, []); m.get(g)!.push(l); }
    return [...m.entries()];
  }, [links]);
  if (!links.length) return null;

  if (isIndex) {
    return (
      <div className="space-y-8">
        {groups.map(([g, ls]) => (
          <section key={g}>
            {g && <h2 className="text-base font-semibold mb-3 text-foreground">{g}</h2>}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {ls.map((l) => (
                <Link key={l.path} to={l.path} className="rounded-xl border border-border/50 bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all">
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

  const visibleGroups = allGroups ? groups : groups.slice(0, GROUPS_PREVIEW);
  return (
    <div className="space-y-3">
      {visibleGroups.map(([g, ls]) => {
        const expanded = open[g] || ls.length <= GROUP_PREVIEW;
        const shown = expanded ? ls : ls.slice(0, GROUP_PREVIEW);
        return (
          <div key={g}>
            {g && <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{g}</h2>}
            <div className="flex flex-wrap gap-1.5">
              {shown.map((l) => <Chip key={l.path} to={l.path}>{label(l.name)} <span className="text-xs opacity-60">({l.count})</span></Chip>)}
              {!expanded && <Chip onClick={() => setOpen((o) => ({ ...o, [g]: true }))}>+ {ls.length - GROUP_PREVIEW} more</Chip>}
            </div>
          </div>
        );
      })}
      {groups.length > GROUPS_PREVIEW && (
        <button type="button" onClick={() => setAllGroups((a) => !a)} className="text-sm text-primary font-medium hover:underline">
          {allGroups ? "Show fewer series" : `Show all ${groups.length} series`}
        </button>
      )}
    </div>
  );
}

export default function CatalogPage() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const selected = { part: params.get("part") || "", brand: params.get("brand") || "", price: params.get("price") || "", stock: params.get("stock") || "" };
  const sort = params.get("sort") || "default";

  const query = useInfiniteQuery({
    queryKey: ["catalog-page", path, selected, sort],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ path, ...selected, sort, offset: String(pageParam) });
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

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || (key !== "sort" && next.get(key) === value) || (key === "sort" && value === "default")) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };

  if ((query.error as any)?.status === 404) return <NotFound />;

  const first = query.data?.pages[0];
  const cat = first?.category;
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const isIndex = !!cat && cat.type.endsWith("_index");
  const hasFilters = FILTER_KEYS.some((k) => selected[k]);
  const filters: SidebarFilters | undefined = first && !isIndex
    ? { facets: first.facets, selected, onChange: setParam, onClear: clearFilters }
    : undefined;
  // Related pages go in the left pane as a collapsible tree (series → models, brands, price ranges)
  const tree: SidebarTree | undefined = useMemo(() => {
    if (!first || !cat || isIndex || !first.links.length) return undefined;
    const brand = cat.type === "brand" || cat.type === "model" || cat.type === "part_brand" ? cat.brand : null;
    const strip = (n: string) => (brand && n.startsWith(brand + " ") ? n.slice(brand.length + 1) : n).replace(/^All /, "");
    const m = new Map<string | null, { name: string; path: string; count: number }[]>();
    for (const l of first.links) { const g = l.grp || null; if (!m.has(g)) m.set(g, []); m.get(g)!.push({ name: strip(l.name), path: l.path, count: l.count }); }
    const groups = [...m.entries()].map(([name, items]) => ({ name, items }));
    const titles: Record<string, string> = { brand: cat.brand + " models & parts", model: "More " + cat.brand + " parts",
      part: cat.heading + " by brand", part_brand: cat.brand + " models", phones_price: "Other price ranges" };
    return { title: titles[cat.type] || "Browse", groups };
  }, [first, cat, isIndex]);

  return (
    <div className="min-h-screen bg-background">
      {cat && <PageSEO title={cat.title} description={cat.description} url={cat.path} noindex={!cat.indexable} />}
      <StoreHeader />

      <div className="container mx-auto px-4 py-4 md:py-6 flex gap-6 items-start">
        <CatalogSidebar active={path} filters={filters} tree={tree} />
        <main className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-3">
            {(first?.breadcrumbs ?? [{ name: "Home", url: "/" }]).map((c, i, a) => (
              <span key={c.url} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {i === a.length - 1 ? <span className="text-foreground">{c.name}</span> : <Link to={c.url} className="hover:text-primary">{c.name}</Link>}
              </span>
            ))}
          </nav>

          {query.isLoading || !cat ? (
            <div className="space-y-4">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-5 w-full max-w-2xl" />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pt-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{cat.heading}</h1>
              <p className="text-muted-foreground mt-1.5 max-w-3xl text-sm md:text-base">{cat.description}</p>

              {isIndex && <div className="mt-5"><LinkGroups links={first.links} isIndex /></div>}

              {!isIndex && (
                <>
                  <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      {first.total.toLocaleString()} listing{first.total === 1 ? "" : "s"}{hasFilters ? " match your filters" : ""}
                      {hasFilters && <button type="button" onClick={clearFilters} className="ml-2 text-primary hover:underline">Clear</button>}
                    </p>
                    <div className="flex items-center gap-2">
                      <MobileSidebar active={path} filters={filters} tree={tree} label="Filter & browse" />
                      <select aria-label="Sort" value={sort} onChange={(e) => setParam("sort", e.target.value)}
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
                        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="mt-8 rounded-xl border border-border/60 bg-card p-8 text-center">
                      <p className="font-medium text-foreground mb-1">No products match these filters.</p>
                      <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                    </div>
                  ) : (
                    <div className={cn("grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 mt-4")}>
                      {items.map((i) => <ShopItemCard key={`${i.source_table}:${i.item_id}`} item={toCard(i)} />)}
                    </div>
                  )}
                  {query.hasNextPage && (
                    <div className="flex justify-center mt-8">
                      <Button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} size="lg" variant="outline">
                        {query.isFetchingNextPage ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> : `Load more (${(first.total - items.length).toLocaleString()} left)`}
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
      </div>
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
