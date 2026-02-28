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
import { ShoppingCart, Search, ArrowLeft, Laptop, Loader2 } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { PageSEO, CollectionSchema, BreadcrumbSchema } from "@/components/PageSEO";

const PAGE_SIZE = 24;

export default function Laptops() {
  const [searchTerm, setSearchTerm]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [brandFilter, setBrandFilter]         = useState("all");
  const [sortBy, setSortBy]                   = useState("newest");
  const [page, setPage]                       = useState(0);
  const [products, setProducts]               = useState<any[]>([]);
  const cartItemsCount = useProductCartStore((state) => state.getTotalItems());

  // Debounce search — 350 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset pagination on filter/search change
  useEffect(() => {
    setPage(0);
    setProducts([]);
  }, [brandFilter, debouncedSearch, sortBy]);

  // ── Category IDs (cached forever) ──────────────────────────────────────────
  const { data: laptopCategories } = useQuery({
    queryKey: ["laptop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id")
        .in("name", ["Laptop & Computer Spare Parts", "Laptop Accessories"]);
      if (error) throw error;
      return data || [];
    },
    staleTime: Infinity,
  });

  const categoryIds = (laptopCategories ?? []).map((c: any) => c.id);

  // ── Brand list (fetched once per category set, cached forever) ─────────────
  const { data: brandsData } = useQuery({
    queryKey: ["laptop-brands", categoryIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("brand")
        .in("category_id", categoryIds);
      if (error) throw error;
      return [...new Set((data ?? []).map((r: any) => r.brand))].sort();
    },
    enabled: categoryIds.length > 0,
    staleTime: Infinity,
  });
  const brands = brandsData ?? [];

  // ── Paginated products query ───────────────────────────────────────────────
  const buildQuery = useCallback(
    (offset: number) => {
      let q = supabase
        .from("products")
        .select("*")
        .in("category_id", categoryIds)
        .limit(PAGE_SIZE)
        .offset(offset);

      if (brandFilter !== "all")    q = q.eq("brand", brandFilter);
      if (debouncedSearch.trim())   q = q.ilike("name", `%${debouncedSearch.trim()}%`);

      if      (sortBy === "price_low")  q = q.order("price", { ascending: true });
      else if (sortBy === "price_high") q = q.order("price", { ascending: false });
      else if (sortBy === "name")       q = q.order("name",  { ascending: true });
      else                              q = q.order("created_at", { ascending: false });

      return q;
    },
    [categoryIds, brandFilter, debouncedSearch, sortBy]
  );

  const { data: pageData, isLoading, isFetching } = useQuery({
    queryKey: ["laptop-products", categoryIds, brandFilter, debouncedSearch, sortBy, page],
    queryFn: async () => {
      if (!categoryIds.length) return [];
      const { data, error } = await buildQuery(page * PAGE_SIZE);
      if (error) throw error;
      return data ?? [];
    },
    enabled: categoryIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Accumulate pages
  useEffect(() => {
    if (!pageData) return;
    setProducts(prev => page === 0 ? pageData : [...prev, ...pageData]);
  }, [pageData]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = (pageData?.length ?? 0) === PAGE_SIZE;
  const isFirstLoad = isLoading && products.length === 0;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Laptops", url: "/laptops" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Laptops | AppleTechStore Pakistan"
        description="Shop quality laptops at best prices in Pakistan. Gaming laptops, business laptops, MacBooks, and more. Fast delivery across Pakistan."
        url="/laptops"
        keywords="laptops Pakistan, gaming laptops, MacBook Pakistan, business laptops, AppleTechStore"
      />
      <CollectionSchema
        name="Laptops"
        description="Shop quality laptops including gaming laptops, business laptops, and MacBooks at best prices in Pakistan."
        url="/laptops"
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
            <h1 className="text-xl font-bold">Laptops</h1>
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
      <section className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <Laptop className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Laptops & Notebooks</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our collection of new and refurbished laptops for work, gaming, and everyday use.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search laptops..."
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

        {!isFirstLoad && (
          <p className="text-sm text-muted-foreground mt-3">
            Showing {products.length} item{products.length !== 1 ? "s" : ""}
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
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No laptops found</p>
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
