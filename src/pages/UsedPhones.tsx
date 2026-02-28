import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { ShoppingCart, Search, ArrowLeft, Loader2 } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { PageSEO, CollectionSchema, BreadcrumbSchema } from "@/components/PageSEO";

const PAGE_SIZE = 24;

export default function UsedPhones() {
  const [searchTerm, setSearchTerm]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [brandFilter, setBrandFilter]     = useState("all");
  const [sortBy, setSortBy]               = useState("newest");
  const [page, setPage]                   = useState(0);
  const [products, setProducts]           = useState<any[]>([]);
  const cartItemsCount = useProductCartStore((state) => state.getTotalItems());

  // Debounce search input — wait 350 ms before querying
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset pagination whenever filters or search change
  useEffect(() => {
    setPage(0);
    setProducts([]);
  }, [brandFilter, debouncedSearch, sortBy]);

  // ── Category ID (fetched once, cached forever) ─────────────────────────────
  const { data: category } = useQuery({
    queryKey: ["used-phones-category"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id")
        .eq("name", "New & Used Phones")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  const categoryId = category?.id ?? null;

  // ── Brand list (fetched once per category, cached forever) ─────────────────
  const { data: brandsData } = useQuery({
    queryKey: ["used-phones-brands", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("brand")
        .eq("category_id", categoryId!);
      if (error) throw error;
      return [...new Set((data ?? []).map((r: any) => r.brand))].sort();
    },
    enabled: !!categoryId,
    staleTime: Infinity,
  });
  const brands = brandsData ?? [];

  // ── Paginated products query ───────────────────────────────────────────────
  const buildQuery = useCallback(
    (offset: number) => {
      let q = supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryId!)
        .limit(PAGE_SIZE)
        .offset(offset);

      if (brandFilter !== "all")     q = q.eq("brand", brandFilter);
      if (debouncedSearch.trim())    q = q.ilike("name", `%${debouncedSearch.trim()}%`);

      if      (sortBy === "price_low")  q = q.order("price", { ascending: true });
      else if (sortBy === "price_high") q = q.order("price", { ascending: false });
      else if (sortBy === "name")       q = q.order("name",  { ascending: true });
      else                              q = q.order("created_at", { ascending: false });

      return q;
    },
    [categoryId, brandFilter, debouncedSearch, sortBy]
  );

  const { data: pageData, isLoading, isFetching } = useQuery({
    queryKey: ["used-phones-products", categoryId, brandFilter, debouncedSearch, sortBy, page],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await buildQuery(page * PAGE_SIZE);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });

  // Accumulate pages — reset on page 0, append on page > 0
  useEffect(() => {
    if (!pageData) return;
    setProducts(prev => page === 0 ? pageData : [...prev, ...pageData]);
  }, [pageData]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = (pageData?.length ?? 0) === PAGE_SIZE;
  const isFirstLoad = isLoading && products.length === 0;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Phones", url: "/phones" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="New & Used Phones | AppleTechStore Pakistan"
        description="Shop new and certified used mobile phones at best prices in Pakistan. iPhone, Samsung, OnePlus, Xiaomi, and more. Quality guaranteed with warranty."
        url="/phones"
        keywords="used phones Pakistan, new phones, iPhone Pakistan, Samsung phones, OnePlus, Xiaomi, AppleTechStore"
      />
      <CollectionSchema
        name="New & Used Phones"
        description="Shop new and certified used mobile phones from top brands including iPhone, Samsung, OnePlus, and Xiaomi at best prices in Pakistan."
        url="/phones"
        itemCount={products.length}
      />
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Used Phones</h1>
          </div>
          <Link to="/cart">
            <Button variant="outline" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pre-Owned Mobile Phones</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Quality checked and certified used phones at unbeatable prices. All devices come with warranty.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search phones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand: string) => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Result count */}
        {!isFirstLoad && (
          <p className="text-sm text-muted-foreground mt-3">
            Showing {products.length} phone{products.length !== 1 ? "s" : ""}
            {hasMore ? " — scroll down to load more" : ""}
          </p>
        )}
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 pb-12">
        {isFirstLoad ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={isFetching}
                  onClick={() => setPage(p => p + 1)}
                >
                  {isFetching ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                  ) : (
                    "Load More Phones"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No phones found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => { setSearchTerm(""); setBrandFilter("all"); }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
