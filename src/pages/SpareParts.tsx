import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SparePartCard } from "@/components/SparePartCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Wrench, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCartButton } from "@/components/ProductCartButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageSEO, CollectionSchema, BreadcrumbSchema } from "@/components/PageSEO";

export default function SpareParts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [partTypeFilter, setPartTypeFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const { data: spareParts, isLoading } = useQuery({
    queryKey: ['spare-parts-public'],
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
          ),
          part_types (
            id,
            name
          ),
          part_qualities (
            id,
            name
          ),
          spare_parts_colors (
            color_name,
            color_code
          )
        `)
        .eq('visible', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: categories } = useQuery({
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

  const { data: partTypes } = useQuery({
    queryKey: ['part-types', categoryFilter],
    queryFn: async () => {
      let query = supabase.from('part_types').select('*').order('name');
      if (categoryFilter !== "all") {
        query = query.eq('category_id', categoryFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: qualities } = useQuery({
    queryKey: ['part-qualities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_qualities')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setPartTypeFilter("all");
    setQualityFilter("all");
    setSortBy("newest");
    setAvailabilityFilter("all");
  };

  const filteredParts = (spareParts || []).filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (part.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || part.part_category_id === categoryFilter;
    const matchesPartType = partTypeFilter === "all" || part.part_type_id === partTypeFilter;
    const matchesQuality = qualityFilter === "all" || part.quality_id === qualityFilter;
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && part.stock > 0) ||
                               (availabilityFilter === "out-of-stock" && part.stock <= 0);
    return matchesSearch && matchesCategory && matchesPartType && matchesQuality && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Spare Parts", url: "/spare-parts" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO 
        title="Phone Spare Parts | AppleTechStore Pakistan"
        description="High-quality replacement parts for all major phone brands. LCD screens, batteries, charging ports, and more. Best prices in Pakistan with fast delivery."
        url="/spare-parts"
        keywords="phone spare parts Pakistan, LCD screen replacement, phone battery, charging port, AppleTechStore"
      />
      <CollectionSchema 
        name="Phone Spare Parts"
        description="High-quality replacement parts for all major phone brands including LCD screens, batteries, charging ports, and more."
        url="/spare-parts"
        itemCount={filteredParts.length}
      />
      <BreadcrumbSchema items={breadcrumbs} />
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
              <Link to="/spare-parts" className="text-primary font-medium">Spare Parts</Link>
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
            <Wrench className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Phone Spare Parts
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            High-quality replacement parts for all major phone brands
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search spare parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={(value) => {
              setCategoryFilter(value);
              setPartTypeFilter("all"); // Reset part type when category changes
            }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All Categories</SelectItem>
                {(categories || []).map(category => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={partTypeFilter} onValueChange={setPartTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Part Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All Types</SelectItem>
                {(partTypes || []).map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Sparkles className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All Qualities</SelectItem>
                {(qualities || []).map(quality => (
                  <SelectItem key={quality.id} value={quality.id}>{quality.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 w-full md:w-auto">
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  <SelectItem value="all">All Parts</SelectItem>
                  <SelectItem value="available">In Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
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
        ) : filteredParts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
              {filteredParts.map((part) => (
                <SparePartCard key={part.id} part={part} />
              ))}
            </div>
            
            <div className="text-center mt-12">
              <p className="text-sm text-muted-foreground">
                Showing {filteredParts.length} {filteredParts.length === 1 ? 'part' : 'parts'}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2">No spare parts found</p>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
