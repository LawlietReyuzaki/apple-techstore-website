import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { SparePartCard } from "@/components/SparePartCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Smartphone, Wrench, Laptop, Headphones, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { ProductCartButton } from "@/components/ProductCartButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import shopHeroBg from "@/assets/shop-hero-bg.png";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") || "phones");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setCategory(categoryParam);
    }
  }, [searchParams]);

  const { data: products, isLoading: isLoadingProducts } = useQuery({
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

  const { data: spareParts, isLoading: isLoadingSpareParts } = useQuery({
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

  const brands = Array.from(new Set((products || []).map(p => p.brand)));
  const isLoading = category === "phones" ? isLoadingProducts : isLoadingSpareParts;

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter === "all" || product.brand === brandFilter;
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && product.stock > 0) ||
                               (availabilityFilter === "out-of-stock" && product.stock <= 0);
    return matchesSearch && matchesBrand && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "brand") return a.brand.localeCompare(b.brand);
    return 0;
  });

  const filteredSpareParts = (spareParts || []).filter(part => {
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

  const displayItems = category === "phones" ? filteredProducts : filteredSpareParts;
  const totalCount = displayItems.length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Header */}
      <header className="glass-effect border-b sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:scale-105 transition-transform">
            Dilbar Mobiles
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="relative group transition-colors">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
              </Link>
              <Link to="/shop" className="relative group text-primary font-medium">
                Shop
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-accent" />
              </Link>
              <Link to="/book-repair" className="relative group transition-colors">
                Repair
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
              </Link>
              <Link to="/track-repair" className="relative group transition-colors">
                Track
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            </nav>
            <ProductCartButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex gap-6">
          {/* Shop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 glass-effect rounded-2xl p-4 border border-primary/10 space-y-2">
              <h3 className="font-semibold text-lg mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Categories
              </h3>
              
              {/* Repairs Link */}
              <Link 
                to="/book-repair"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/10 transition-all duration-300 group"
              >
                <Wrench className="h-5 w-5 text-primary" />
                <span className="font-medium group-hover:text-primary transition-colors">Repairs</span>
              </Link>
              
              {/* Used Phones */}
              <Link 
                to="/phones"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/10 transition-all duration-300 group"
              >
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="font-medium group-hover:text-primary transition-colors">Used Phones</span>
              </Link>
              
              {/* Laptops */}
              <Link 
                to="/laptops"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/10 transition-all duration-300 group"
              >
                <Laptop className="h-5 w-5 text-primary" />
                <span className="font-medium group-hover:text-primary transition-colors">Laptops</span>
              </Link>
              
              {/* Accessories - Expandable */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-primary/10 transition-all duration-300 group">
                  <div className="flex items-center gap-3">
                    <Headphones className="h-5 w-5 text-primary" />
                    <span className="font-medium group-hover:text-primary transition-colors">Accessories</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-1 mt-1">
                  <Link 
                    to="/accessories/mobile"
                    className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  >
                    Mobile Accessories
                  </Link>
                  <Link 
                    to="/accessories/laptop"
                    className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  >
                    Laptop Accessories
                  </Link>
                  <Link 
                    to="/accessories/pc"
                    className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  >
                    PC Accessories
                  </Link>
                  <Link 
                    to="/accessories/computer"
                    className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  >
                    Computer Accessories
                  </Link>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
        {/* Page Header */}
        <div className="mb-12 text-center animate-fade-in-up relative rounded-3xl overflow-hidden group">
          <div 
            className="absolute inset-0 bg-cover bg-center transform transition-transform duration-700 group-hover:scale-110"
            style={{ backgroundImage: `url(${shopHeroBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-primary/20 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient-shift opacity-50 blur-sm" />
          
          <div className="relative z-10 py-20 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-lg mb-6 animate-glow shadow-2xl border border-white/10">
              {category === "phones" ? (
                <Smartphone className="h-10 w-10 text-white drop-shadow-lg" />
              ) : (
                <Wrench className="h-10 w-10 text-white drop-shadow-lg" />
              )}
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-white drop-shadow-2xl bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
              {category === "phones" ? "Shop Premium Phones" : "Phone Spare Parts"}
            </h1>
            <p className="text-white/95 text-xl md:text-2xl max-w-3xl mx-auto font-light tracking-wide drop-shadow-lg">
              {category === "phones" 
                ? "Discover our curated collection of flagship smartphones with competitive pricing"
                : "High-quality replacement parts for all major phone brands"}
            </p>
            
            {/* Decorative Elements */}
            <div className="absolute top-10 right-10 w-20 h-20 border-2 border-white/20 rounded-full animate-pulse-slow" />
            <div className="absolute bottom-10 left-10 w-16 h-16 border-2 border-accent/30 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-8 animate-scale-in">
          <Tabs value={category} onValueChange={(value) => {
            setCategory(value);
            setSearchParams({ category: value });
            setBrandFilter("all");
          }}>
            <TabsList className="grid w-full max-w-md grid-cols-2 p-1 glass-effect shadow-xl border-primary/20">
              <TabsTrigger 
                value="phones" 
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Smartphone className="h-4 w-4" />
                Phones
              </TabsTrigger>
              <TabsTrigger 
                value="spare-parts" 
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Wrench className="h-4 w-4" />
                Spare Parts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-slide-in-left">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary transition-all duration-300 group-focus-within:scale-110" />
            <Input
              placeholder="Search devices by brand, model, or specs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 glass-effect border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all duration-300 text-base"
            />
          </div>
          
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-12 glass-effect border-primary/20 hover:border-primary/50 transition-all duration-300">
              <Filter className="mr-2 h-4 w-4 text-primary" />
              <SelectValue placeholder={category === "phones" ? "All Brands" : "All Categories"} />
            </SelectTrigger>
            <SelectContent className="glass-effect">
              <SelectItem value="all">{category === "phones" ? "All Brands" : "All Categories"}</SelectItem>
              {category === "phones" ? (
                brands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))
              ) : (
                (partCategories || []).map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-full md:w-[180px] h-12 glass-effect border-primary/20 hover:border-primary/50 transition-all duration-300">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent className="glass-effect">
              <SelectItem value="all">{category === "phones" ? "All Devices" : "All Parts"}</SelectItem>
              <SelectItem value="available">{category === "phones" ? "Available Now" : "In Stock"}</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px] h-12 glass-effect border-primary/20 hover:border-primary/50 transition-all duration-300">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="glass-effect">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              {category === "phones" && <SelectItem value="brand">Brand (A-Z)</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4 animate-pulse">
                <Skeleton className="h-64 w-full rounded-2xl glass-effect" />
                <Skeleton className="h-4 w-3/4 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {category === "phones" ? (
                filteredProducts.map((product, index) => (
                  <div 
                    key={product.id} 
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))
              ) : (
                filteredSpareParts.map((part, index) => (
                  <div 
                    key={part.id} 
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <SparePartCard part={part} />
                  </div>
                ))
              )}
            </div>
            
            <div className="text-center mt-16 animate-fade-in-up">
              <div className="inline-block px-6 py-3 glass-effect rounded-full border border-primary/20">
                <p className="text-sm font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Showing {totalCount} {totalCount === 1 ? (category === "phones" ? 'product' : 'part') : (category === "phones" ? 'products' : 'parts')}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-24 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm mb-6 animate-pulse-slow border border-primary/20">
              {category === "phones" ? (
                <Smartphone className="h-12 w-12 text-primary" />
              ) : (
                <Wrench className="h-12 w-12 text-primary" />
              )}
            </div>
            <p className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              No {category === "phones" ? "products" : "spare parts"} found
            </p>
            <p className="text-muted-foreground text-lg mb-6">
              Try adjusting your search or filters
            </p>
            <button 
              onClick={() => {
                setSearchTerm("");
                setBrandFilter("all");
                setAvailabilityFilter("all");
              }}
              className="px-8 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:scale-105 hover:shadow-xl transition-all duration-300 animate-glow"
            >
              Clear All Filters
            </button>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
