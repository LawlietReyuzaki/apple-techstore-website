import { useState, useEffect } from "react";
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
  Battery, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { ProductCartButton } from "@/components/ProductCartButton";
import { Skeleton } from "@/components/ui/skeleton";
import shopHeroBg from "@/assets/shop-hero-bg.png";

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

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  // Fetch dynamic categories from database
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

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setCategory(categoryParam);
    }
  }, [searchParams]);

  // Get current category details
  const currentCategory = shopCategories.find(c => c.slug === category);
  const CurrentIcon = currentCategory ? getCategoryIcon(currentCategory.name) : Package;

  // Fetch shop_items for dynamic categories
  const { data: shopItems = [], isLoading: isLoadingShopItems } = useQuery({
    queryKey: ['shop-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_items')
        .select(`
          *,
          shop_categories (
            id,
            name,
            slug
          ),
          shop_brands (
            id,
            name
          )
        `)
        .eq('visible', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: spareParts = [], isLoading: isLoadingSpareParts } = useQuery({
    queryKey: ['spare-parts-shop'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts')
        .select(`
          *,
          phone_models (
            name,
            spare_parts_brands (
              name
            )
          ),
          part_categories (
            name
          )
        `)
        .eq('visible', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: partCategories } = useQuery({
    queryKey: ['part-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Get unique brands from all sources for filtering
  const shopBrands = Array.from(new Set(shopItems.map(item => item.shop_brands?.name).filter(Boolean)));
  const productBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
  const allBrands = Array.from(new Set([...shopBrands, ...productBrands])).sort();

  // Filter shop items based on current category and filters
  const filteredShopItems = shopItems.filter(item => {
    const matchesCategory = category === "all" || item.shop_categories?.slug === category;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter === "all" || item.shop_brands?.name === brandFilter;
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && (item.stock || 0) > 0) ||
                               (availabilityFilter === "out-of-stock" && (item.stock || 0) <= 0);
    return matchesCategory && matchesSearch && matchesBrand && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter === "all" || product.brand === brandFilter;
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && (product.stock || 0) > 0) ||
                               (availabilityFilter === "out-of-stock" && (product.stock || 0) <= 0);
    return matchesSearch && matchesBrand && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "brand") return a.brand.localeCompare(b.brand);
    return 0;
  });

  const filteredSpareParts = spareParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (part.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = brandFilter === "all" || part.part_category_id === brandFilter;
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && part.stock > 0) ||
                               (availabilityFilter === "out-of-stock" && part.stock <= 0);
    return matchesSearch && matchesCategory && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  // Determine which items to display based on category
  const isShopCategory = category !== "all" && shopCategories.some(c => c.slug === category);
  const isLoading = isLoadingShopItems || isLoadingProducts || isLoadingSpareParts || isLoadingCategories;
  
  // Used Phones category ID
  const USED_PHONES_CATEGORY_ID = 'd6cedc35-4e44-4392-8483-b1ab8f2c11df';

  // Map product category_id to shop category slug
  const getProductShopCategory = (categoryId: string | null) => {
    // Map from products.category_id to shop_categories slug
    const categoryMap: Record<string, { id: string; name: string; slug: string }> = {
      // Accessories category
      '6065ce07-0cc9-4609-8faa-c6e45897b898': { id: 'mobile-accessories', name: 'Mobile Accessories', slug: 'mobile-accessories' },
      // Laptops category
      '739f7b1d-0408-4ebe-85b7-d8caf128f18f': { id: 'laptop-accessories', name: 'Laptop Accessories', slug: 'laptop-accessories' },
      // Smartphones category
      '96dd7488-f9d0-43cd-8db9-998be0c29a50': { id: 'new-used-phones', name: 'New & Used Phones', slug: 'new-used-phones' },
      // Used Phones category
      'd6cedc35-4e44-4392-8483-b1ab8f2c11df': { id: 'new-used-phones', name: 'New & Used Phones', slug: 'new-used-phones' },
    };
    // Default to new-used-phones for phones without category (like the device catalog phones)
    return categoryId && categoryMap[categoryId] 
      ? categoryMap[categoryId] 
      : { id: 'new-used-phones', name: 'New & Used Phones', slug: 'new-used-phones' };
  };
  
  // Determine condition based on category
  const getProductCondition = (categoryId: string | null) => {
    return categoryId === USED_PHONES_CATEGORY_ID ? 'used' : 'new';
  };

  // Normalize products to shop item format for unified display
  const normalizedProducts = filteredProducts.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    sale_price: product.sale_price,
    stock: product.stock,
    images: product.images,
    featured: product.featured,
    category_id: product.category_id,
    shop_categories: getProductShopCategory(product.category_id),
    shop_brands: { id: product.brand, name: product.brand },
    condition: getProductCondition(product.category_id),
    _type: 'product' as const
  }));

  // Normalize spare parts to shop item format for unified display
  // Map to 'mobile-spare-parts' category slug
  const normalizedSpareParts = filteredSpareParts.map(part => ({
    id: part.id,
    name: part.name,
    description: part.description,
    price: part.price,
    sale_price: null,
    stock: part.stock,
    images: part.images,
    featured: part.featured,
    category_id: part.part_category_id,
    shop_categories: { id: 'mobile-spare-parts', name: 'Mobile Spare Parts', slug: 'mobile-spare-parts' },
    shop_brands: { id: part.phone_models?.spare_parts_brands?.name || '', name: part.phone_models?.spare_parts_brands?.name || 'Unknown' },
    condition: 'new',
    _type: 'spare_part' as const
  }));

  // Normalize shop items
  const normalizedShopItems = filteredShopItems.map(item => ({
    ...item,
    _type: 'shop_item' as const
  }));
  
  // Combine all normalized items
  const allNormalizedItems = [...normalizedShopItems, ...normalizedProducts, ...normalizedSpareParts];
  
  // Get display items - filter by category
  const displayItems = category === "all" 
    ? allNormalizedItems
    : allNormalizedItems.filter(item => item.shop_categories?.slug === category);
  
  const totalCount = displayItems.length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
      </div>

      {/* Minimal Header */}
      <header className="bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
            Dilbar Mobiles
          </Link>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/shop" className="text-primary">
                Shop
              </Link>
              <Link to="/book-repair" className="text-muted-foreground hover:text-foreground transition-colors">
                Repair
              </Link>
              <Link to="/track-repair" className="text-muted-foreground hover:text-foreground transition-colors">
                Track
              </Link>
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
        <div className="flex justify-center mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {isLoadingCategories ? (
            <div className="flex gap-2 flex-wrap justify-center">
              {[1, 2, 3, 4, 5].map((i) => (
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
              {shopCategories.map((cat) => {
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
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 mb-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              Showing <span className="font-medium text-foreground">{totalCount}</span> {totalCount === 1 ? 'item' : 'items'}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
              <CurrentIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold mb-2 text-foreground">
              No items found
            </p>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filters
            </p>
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
