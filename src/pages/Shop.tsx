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
import { Search, Filter, Smartphone, Wrench } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ProductCartButton } from "@/components/ProductCartButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <Link to="/shop" className="text-primary font-medium">Shop</Link>
              <Link to="/book-repair" className="hover:text-primary transition-colors">Repair</Link>
              <Link to="/track-repair" className="hover:text-primary transition-colors">Track</Link>
            </nav>
            <ProductCartButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-12 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {category === "phones" ? (
              <Smartphone className="h-8 w-8 text-primary" />
            ) : (
              <Wrench className="h-8 w-8 text-primary" />
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {category === "phones" ? "Shop Premium Phones" : "Phone Spare Parts"}
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            {category === "phones" 
              ? "Discover our curated collection of flagship smartphones with competitive pricing"
              : "High-quality replacement parts for all major phone brands"}
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <Tabs value={category} onValueChange={(value) => {
            setCategory(value);
            setSearchParams({ category: value });
            setBrandFilter("all");
          }}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="phones" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Phones
              </TabsTrigger>
              <TabsTrigger value="spare-parts" className="gap-2">
                <Wrench className="h-4 w-4" />
                Spare Parts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-in">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices by brand, model, or specs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder={category === "phones" ? "All Brands" : "All Categories"} />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{category === "phones" ? "All Devices" : "All Parts"}</SelectItem>
              <SelectItem value="available">{category === "phones" ? "Available Now" : "In Stock"}</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
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
              <div key={i} className="space-y-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
              {category === "phones" ? (
                filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                filteredSpareParts.map((part) => (
                  <SparePartCard key={part.id} part={part} />
                ))
              )}
            </div>
            
            <div className="text-center mt-12">
              <p className="text-sm text-muted-foreground">
                Showing {totalCount} {totalCount === 1 ? (category === "phones" ? 'product' : 'part') : (category === "phones" ? 'products' : 'parts')}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              {category === "phones" ? (
                <Smartphone className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Wrench className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-lg font-medium mb-2">No {category === "phones" ? "products" : "spare parts"} found</p>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
