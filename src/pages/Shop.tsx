import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { SparePartCard } from "@/components/SparePartCard";
import { ShopItemCard } from "@/components/ShopItemCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search, Filter, Smartphone, Wrench, Laptop, Headphones,
  Package, Cpu, Monitor, Tv, Wind, UtensilsCrossed, Refrigerator, Shield, FolderOpen,
  Battery, Zap, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { ProductCartButton } from "@/components/ProductCartButton";
import { Skeleton } from "@/components/ui/skeleton";
import shopHeroBg from "@/assets/shop-hero-bg.png";
import { PageSEO, CollectionSchema, BreadcrumbSchema } from "@/components/PageSEO";

// Map category names to icons
const getCategoryIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("phone") || lowerName.includes("mobile")) return Smartphone;
  if (lowerName.includes("laptop")) return Laptop;
  if (lowerName.includes("accessori") || lowerName.includes("headphone") || lowerName.includes("earphone")) return Headphones;
  if (lowerName.includes("spare") || lowerName.includes("part") || lowerName.includes("repair")) return Wrench;
  if (lowerName.includes("protector") || lowerName.includes("skin") || lowerName.includes("case")) return Shield;
  if (lowerName.includes("computer") || lowerName.includes("pc")) return Monitor;
  if (lowerName.includes("microwave") || lowerName.includes("oven")) return Tv;
  if (lowerName.includes("air") || lowerName.includes("conditioner") || lowerName.includes("ac")) return Wind;
  if (lowerName.includes("kitchen")) return UtensilsCrossed;
  if (lowerName.includes("refrigerator") || lowerName.includes("fridge")) return Refrigerator;
  if (lowerName.includes("cpu") || lowerName.includes("processor")) return Cpu;
  if (lowerName.includes("power") || lowerName.includes("bank") || lowerName.includes("battery")) return Battery;
  if (lowerName.includes("charger") || lowerName.includes("cable")) return Zap;
  return Package;
};

// ── Page size for paginated queries ──────────────────────────────────────────
// Initial load: fewer items for faster first page load
const INITIAL_PAGE_SIZE = 12;
// Subsequent loads: more items for better UX when loading more
const PAGE_SIZE = 24;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  // ── Shop categories (for category pills UI) ──────────────────────────────
  const { data: shopCategories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Product categories (for UUID ↔ slug mapping) ─────────────────────────
  // These are the 6 valid categories in the `categories` table.
  // shop_categories and categories share identical names, so we match by name.
  const { data: productCategories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name");
      return data || [];
    },
    staleTime: Infinity, // categories never change mid-session
  });

  // slug → product category UUID  (e.g. "new-used-phones" → "e087e164-...")
  const slugToProductCategoryId = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const shopCat of shopCategories) {
      const prodCat = productCategories.find(pc => pc.name === shopCat.name);
      if (prodCat) map[shopCat.slug] = prodCat.id;
    }
    return map;
  }, [shopCategories, productCategories]);

  // product category UUID → slug  (e.g. "e087e164-..." → "new-used-phones")
  const productCategoryIdToSlug = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const [slug, id] of Object.entries(slugToProductCategoryId)) {
      map[id] = slug;
    }
    return map;
  }, [slugToProductCategoryId]);

  // UUID of "New & Used Phones" — used for condition detection
  const USED_PHONES_CATEGORY_ID = useMemo(
    () => productCategories.find(pc => pc.name === "New & Used Phones")?.id ?? "",
    [productCategories]
  );

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) setCategory(categoryParam);
  }, [searchParams]);

  // Get current category details
  const currentCategory = shopCategories.find(c => c.slug === category);
  const CurrentIcon = currentCategory ? getCategoryIcon(currentCategory.name) : Package;

  // ── Shop items (small dataset, client-side filtered) ─────────────────────
  const { data: shopItems = [], isLoading: isLoadingShopItems } = useQuery({
    queryKey: ["shop-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select(`
          *,
          shop_categories (id, name, slug),
          shop_brands    (id, name)
        `)
        .eq("visible", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Products: server-side category filter + server-side pagination ────────
  // The category UUID to filter by (null = "all" = no filter)
  const productCategoryId = useMemo(
    () => (category !== "all" ? (slugToProductCategoryId[category] ?? null) : null),
    [category, slugToProductCategoryId]
  );

  const [productItems, setProductItems] = useState<any[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);

  const buildProductsQuery = useCallback(
    (offset: number, limit: number = PAGE_SIZE) => {
      let q = supabase
        .from("products")
        .select("*")
        .limit(limit)
        .offset(offset);

      // ── Server-side filters ──────────────────────────────────────────────
      if (productCategoryId)           q = q.eq("category_id", productCategoryId);
      if (brandFilter !== "all")       q = q.eq("brand", brandFilter);
      if (searchTerm.trim())           q = q.ilike("name", `%${searchTerm.trim()}%`);
      if (availabilityFilter === "available")     q = q.gt("stock", 0);
      if (availabilityFilter === "out-of-stock")  q = q.lte("stock", 0);

      // ── Server-side sort ─────────────────────────────────────────────────
      if (sortBy === "price-low")  q = q.order("price", { ascending: true });
      else if (sortBy === "price-high") q = q.order("price", { ascending: false });
      else if (sortBy === "name")  q = q.order("name", { ascending: true });
      else                         q = q.order("created_at", { ascending: false });

      return q;
    },
    [productCategoryId, brandFilter, searchTerm, availabilityFilter, sortBy]
  );

  // Initial fetch / re-fetch when any filter or category changes
  useEffect(() => {
    // Wait until the slug→UUID mapping is ready before making category-filtered queries
    const mappingReady =
      category === "all" || Object.keys(slugToProductCategoryId).length > 0;
    if (!mappingReady) return;

    let cancelled = false;
    setIsLoadingProducts(true);
    setProductItems([]);

    buildProductsQuery(0, INITIAL_PAGE_SIZE).then(({ data }) => {
      if (cancelled) return;
      const rows = data || [];
      setProductItems(rows);
      setHasMoreProducts(rows.length >= INITIAL_PAGE_SIZE);
      setIsLoadingProducts(false);
    });

    return () => { cancelled = true; };
  }, [buildProductsQuery, slugToProductCategoryId, category]);

  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMoreProducts || !hasMoreProducts) return;
    setIsLoadingMoreProducts(true);
    const { data } = await buildProductsQuery(productItems.length, PAGE_SIZE);
    const rows = data || [];
    setProductItems(prev => [...prev, ...rows]);
    setHasMoreProducts(rows.length >= PAGE_SIZE);
    setIsLoadingMoreProducts(false);
  }, [isLoadingMoreProducts, hasMoreProducts, productItems.length, buildProductsQuery]);

  // ── Spare parts: server-side pagination (unchanged) ──────────────────────
  const [sparePartsItems, setSparePartsItems] = useState<any[]>([]);
  const [hasMoreSpareParts, setHasMoreSpareParts] = useState(true);
  const [isLoadingSpareParts, setIsLoadingSpareParts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sparePartsVisible = category === "all" || category === "mobile-spare-parts";

  const buildSparePartsQuery = useCallback(
    (offset: number, limit: number = PAGE_SIZE) => {
      let q = supabase
        .from("spare_parts")
        .select(`
          *,
          phone_models (name, spare_parts_brands (name)),
          part_categories (name)
        `)
        .eq("visible", true)
        .limit(limit)
        .offset(offset);

      if (searchTerm.trim())                    q = q.ilike("name", `%${searchTerm.trim()}%`);
      if (availabilityFilter === "available")   q = q.gt("stock", 0);
      if (availabilityFilter === "out-of-stock") q = q.lte("stock", 0);
      if (sortBy === "price-low")  q = q.order("price", { ascending: true });
      else if (sortBy === "price-high") q = q.order("price", { ascending: false });
      else if (sortBy === "name")  q = q.order("name", { ascending: true });
      else                         q = q.order("created_at", { ascending: false });

      return q;
    },
    [searchTerm, availabilityFilter, sortBy]
  );

  useEffect(() => {
    if (!sparePartsVisible) {
      setSparePartsItems([]);
      setHasMoreSpareParts(false);
      setIsLoadingSpareParts(false);
      return;
    }
    let cancelled = false;
    setIsLoadingSpareParts(true);
    buildSparePartsQuery(0, INITIAL_PAGE_SIZE).then(({ data }) => {
      if (cancelled) return;
      const rows = data || [];
      setSparePartsItems(rows);
      setHasMoreSpareParts(rows.length >= INITIAL_PAGE_SIZE);
      setIsLoadingSpareParts(false);
    });
    return () => { cancelled = true; };
  }, [buildSparePartsQuery, sparePartsVisible]);

  const loadMoreSpareParts = useCallback(async () => {
    if (isLoadingMore || !hasMoreSpareParts) return;
    setIsLoadingMore(true);
    const { data } = await buildSparePartsQuery(sparePartsItems.length, PAGE_SIZE);
    const rows = data || [];
    setSparePartsItems(prev => [...prev, ...rows]);
    setHasMoreSpareParts(rows.length >= PAGE_SIZE);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreSpareParts, sparePartsItems.length, buildSparePartsQuery]);

  const { data: partCategories } = useQuery({
    queryKey: ["part-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("part_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // ── Infinite scroll: auto-load more when "Load More" button comes into view
  const loadMoreButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !isLoadingMoreProducts) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreButtonRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasMoreProducts, isLoadingMoreProducts, loadMoreProducts]);

  // ── Brands for filter dropdown (from loaded product items) ───────────────
  const shopBrands = useMemo(
    () => Array.from(new Set(shopItems.map(i => i.shop_brands?.name).filter(Boolean))),
    [shopItems]
  );
  const productBrands = useMemo(
    () => Array.from(new Set(productItems.map(p => p.brand).filter(Boolean))),
    [productItems]
  );
  const allBrands = useMemo(
    () => Array.from(new Set([...shopBrands, ...productBrands])).sort(),
    [shopBrands, productBrands]
  );

  // ── Filter shop items client-side (small dataset) ────────────────────────
  const filteredShopItems = shopItems
    .filter(item => {
      const matchesCategory =
        category === "all" || item.shop_categories?.slug === category;
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesBrand =
        brandFilter === "all" || item.shop_brands?.name === brandFilter;
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available"    && (item.stock || 0) > 0) ||
        (availabilityFilter === "out-of-stock" && (item.stock || 0) <= 0);
      return matchesCategory && matchesSearch && matchesBrand && matchesAvailability;
    })
    .sort((a, b) => {
      if (sortBy === "price-low")  return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
      if (sortBy === "name")       return a.name.localeCompare(b.name);
      return 0;
    });

  // Products are already filtered server-side — no client-side re-filter needed
  const filteredProducts = productItems;

  // Spare parts: brandFilter currently maps part_category_id — keep as-is
  const filteredSpareParts = sparePartsItems.filter(
    part => brandFilter === "all" || part.part_category_id === brandFilter
  );

  // ── Normalize to a unified card format ───────────────────────────────────

  // Map product.category_id → { slug, name } using DYNAMIC mapping (no hardcoded UUIDs)
  const getProductShopCategory = useCallback(
    (categoryId: string | null) => {
      const slug = categoryId
        ? (productCategoryIdToSlug[categoryId] ?? "new-used-phones")
        : "new-used-phones";
      const shopCat = shopCategories.find(c => c.slug === slug);
      return shopCat
        ? { id: shopCat.id, name: shopCat.name, slug: shopCat.slug }
        : { id: slug, name: slug, slug };
    },
    [productCategoryIdToSlug, shopCategories]
  );

  const getProductCondition = useCallback(
    (categoryId: string | null) =>
      categoryId === USED_PHONES_CATEGORY_ID ? "used" : "new",
    [USED_PHONES_CATEGORY_ID]
  );

  const normalizedProducts = useMemo(
    () =>
      filteredProducts.map(product => ({
        id:            product.id,
        name:          product.name,
        description:   product.description,
        price:         product.price,
        sale_price:    product.sale_price,
        stock:         product.stock,
        images:        product.images,
        featured:      product.featured,
        category_id:   product.category_id,
        shop_categories: getProductShopCategory(product.category_id),
        shop_brands:   { id: product.brand, name: product.brand },
        condition:     getProductCondition(product.category_id),
        _type:         "product" as const,
      })),
    [filteredProducts, getProductShopCategory, getProductCondition]
  );

  const normalizedSpareParts = useMemo(
    () =>
      filteredSpareParts.map(part => ({
        id:            part.id,
        name:          part.name,
        description:   part.description,
        price:         part.price,
        sale_price:    null,
        stock:         part.stock,
        images:        part.images,
        featured:      part.featured,
        category_id:   part.part_category_id,
        shop_categories: { id: "mobile-spare-parts", name: "Mobile Spare Parts", slug: "mobile-spare-parts" },
        shop_brands:   {
          id:   part.phone_models?.spare_parts_brands?.name || "",
          name: part.phone_models?.spare_parts_brands?.name || "Unknown",
        },
        condition:     "new",
        _type:         "spare_part" as const,
      })),
    [filteredSpareParts]
  );

  const normalizedShopItems = useMemo(
    () => filteredShopItems.map(item => ({ ...item, _type: "shop_item" as const })),
    [filteredShopItems]
  );

  // ── Combine and filter by selected category ──────────────────────────────
  // Products are ALREADY server-side filtered by category.
  // Shop items and spare parts are filtered above.
  // Only the "all" check matters at this level.
  const allNormalizedItems = useMemo(
    () => [...normalizedShopItems, ...normalizedProducts, ...normalizedSpareParts],
    [normalizedShopItems, normalizedProducts, normalizedSpareParts]
  );

  const displayItems = useMemo(
    () =>
      category === "all"
        ? allNormalizedItems
        : allNormalizedItems.filter(item => item.shop_categories?.slug === category),
    [category, allNormalizedItems]
  );

  const totalCount = displayItems.length;
  const hasMoreAny = hasMoreProducts || hasMoreSpareParts;

  const isLoading =
    isLoadingShopItems ||
    isLoadingProducts ||
    isLoadingSpareParts ||
    isLoadingCategories;

  // ── SEO ──────────────────────────────────────────────────────────────────
  const pageTitle =
    category === "all"
      ? "Shop All Products | AppleTechStore Pakistan"
      : `${currentCategory?.name || "Shop"} | AppleTechStore Pakistan`;

  const pageDescription =
    category === "all"
      ? "Browse our complete collection of mobile phones, laptops, accessories, and spare parts at best prices in Pakistan. Fast delivery across Pakistan."
      : currentCategory?.description ||
        `Shop ${currentCategory?.name || "products"} at best prices in Pakistan. Quality products with fast delivery.`;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    ...(category !== "all" && currentCategory
      ? [{ name: currentCategory.name, url: `/shop?category=${category}` }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <PageSEO
        title={pageTitle}
        description={pageDescription}
        url={category === "all" ? "/shop" : `/shop?category=${category}`}
        keywords="mobile phones Pakistan, laptops Pakistan, phone accessories, spare parts, AppleTechStore"
      />
      <CollectionSchema
        name={category === "all" ? "All Products" : currentCategory?.name || "Shop"}
        description={pageDescription}
        url={category === "all" ? "/shop" : `/shop?category=${category}`}
        itemCount={totalCount}
      />
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Subtle Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: "3s" }} />
      </div>

      {/* Minimal Header */}
      <header className="bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
            Dilbar Mobiles
          </Link>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/shop" className="text-primary">Shop</Link>
              <Link to="/book-repair" className="text-muted-foreground hover:text-foreground transition-colors">Repair</Link>
              <Link to="/track-repair" className="text-muted-foreground hover:text-foreground transition-colors">Track</Link>
            </nav>
            <ProductCartButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Compact Hero Section */}
        <div className="mb-10 text-center relative rounded-2xl overflow-hidden group animate-fade-in">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-700 group-hover:scale-110"
            style={{ backgroundImage: `url(${shopHeroBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          <div className="relative z-10 py-16 px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-5 border border-white/20">
              <CurrentIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white tracking-tight">
              {category === "all" ? "All Products" : currentCategory?.name || "Shop"}
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto">
              {currentCategory?.description || "Browse our curated collection"}
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex justify-center mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {isLoadingCategories ? (
            <div className="flex gap-2 flex-wrap justify-center">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-24 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center max-w-4xl">
              <button
                onClick={() => {
                  setCategory("all");
                  setSearchParams({ category: "all" });
                  setBrandFilter("all");
                }}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  category === "all"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="h-4 w-4" />
                All
              </button>
              {shopCategories.map(cat => {
                const Icon = getCategoryIcon(cat.name);
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.slug);
                      setSearchParams({ category: cat.slug });
                      setBrandFilter("all");
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      category === cat.slug
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search & Filters Row */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 mb-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-background border-border/50 focus:border-primary/50"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-10 bg-background border-border/50">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {allBrands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-10 bg-background border-border/50">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="available">In Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[150px] h-10 bg-background border-border/50">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low → High</SelectItem>
                  <SelectItem value="price-high">Price: High → Low</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  {category === "phones" && <SelectItem value="brand">Brand (A-Z)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{totalCount}</span>{" "}
              {totalCount === 1 ? "item" : "items"}
              {hasMoreAny && (
                <span className="text-muted-foreground"> &mdash; scroll down for more</span>
              )}
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <>
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              {displayItems.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                >
                  <ShopItemCard item={item} />
                </div>
              ))}
            </div>

            {/* Load More — Products */}
            {hasMoreProducts && !isLoadingSpareParts && (
              <div ref={loadMoreButtonRef} className="flex justify-center mt-8">
                <button
                  onClick={loadMoreProducts}
                  disabled={isLoadingMoreProducts}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoadingMoreProducts ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    "Load More Products"
                  )}
                </button>
              </div>
            )}

            {/* Load More — Spare Parts */}
            {sparePartsVisible && (hasMoreSpareParts || isLoadingMore) && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={loadMoreSpareParts}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    "Load More Parts"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
              <CurrentIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold mb-2 text-foreground">No items found</p>
            <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setBrandFilter("all");
                setAvailabilityFilter("all");
              }}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
