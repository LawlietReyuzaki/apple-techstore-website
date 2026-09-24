import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FolderOpen, Loader2, Sparkles } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { CatalogSidebar, MobileSidebar } from "@/components/CatalogSidebar";
import { ShopItemCard } from "@/components/ShopItemCard";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toCard, CatalogItem } from "@/lib/catalogCard";

interface SearchPage {
  q: string; corrected: string | null; relaxed: boolean;
  suggestions: { text: string; path: string }[];
  categories: { path: string; name: string; type: string; count: number }[];
  items: CatalogItem[]; total: number;
}
const PAGE = 48;

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();

  const query = useInfiniteQuery({
    queryKey: ["search-results", q],
    enabled: q.length > 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/catalog/search?full=1&q=${encodeURIComponent(q)}&limit=${PAGE}&offset=${pageParam}`);
      if (!res.ok) throw new Error("Search failed");
      return (await res.json()) as SearchPage;
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    staleTime: 60 * 1000,
  });

  const first = query.data?.pages[0];
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO title={q ? `Search: ${q} | AppleTechStore` : "Search | AppleTechStore"}
        description={`Search results for ${q} at AppleTechStore — phones, spare parts and accessories in Pakistan.`}
        url={`/search?q=${encodeURIComponent(q)}`} noindex />
      <StoreHeader initialQuery={q} />

      <div className="container mx-auto px-4 py-4 md:py-6 flex gap-6 items-start">
        <CatalogSidebar />
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {q ? <>Results for “{q}”</> : "Search"}
              {first && <span className="text-sm font-normal text-muted-foreground ml-2">{first.total.toLocaleString()} listings</span>}
            </h1>
            <MobileSidebar />
          </div>

          {!q && <p className="text-muted-foreground">Type a brand, model or part name in the search bar above.</p>}

          {first?.corrected && first.corrected !== q.toLowerCase() && (
            <p className="mb-3 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Showing results for <b>{q}</b>. Did you mean{" "}
              <Link to={`/search?q=${encodeURIComponent(first.corrected)}`} className="text-primary font-medium hover:underline">{first.corrected}</Link>?
            </p>
          )}
          {first?.relaxed && <p className="mb-3 text-sm text-muted-foreground">Some words didn't match anything, so they were ignored.</p>}

          {first && first.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {first.categories.map((c) => (
                <Link key={c.path} to={c.path}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border/60 bg-card hover:border-primary/50">
                  <FolderOpen className="h-3.5 w-3.5 text-primary" /> {c.name} <span className="text-xs text-muted-foreground">({c.count})</span>
                </Link>
              ))}
            </div>
          )}

          {query.isLoading && q && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
            </div>
          )}
          {query.isError && (
            <div className="text-center py-12"><p className="text-muted-foreground mb-4">Search isn't available right now.</p><Button onClick={() => query.refetch()}>Try again</Button></div>
          )}
          {first && first.total === 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
              <p className="font-semibold text-foreground mb-1">No products match “{q}”.</p>
              <p className="text-sm text-muted-foreground mb-4">Check the spelling, try fewer words, or browse by brand or part type.</p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Link to="/brands"><Button variant="outline" size="sm">Browse brands</Button></Link>
                <Link to="/parts"><Button variant="outline" size="sm">Browse parts</Button></Link>
                <Link to="/request-part"><Button size="sm">Request this part</Button></Link>
              </div>
            </div>
          )}
          {items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
              {items.map((i) => <ShopItemCard key={`${i.source_table}:${i.item_id}`} item={toCard(i)} />)}
            </div>
          )}
          {query.hasNextPage && (
            <div className="flex justify-center mt-8">
              <Button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} size="lg" variant="outline">
                {query.isFetchingNextPage ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> : `Load more (${(first!.total - items.length).toLocaleString()} left)`}
              </Button>
            </div>
          )}
        </main>
      </div>
      <WhatsAppFloatingButton />
    </div>
  );
}
