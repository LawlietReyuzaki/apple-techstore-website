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
import { Search, Filter, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCartButton } from "@/components/ProductCartButton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SpareParts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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
              name,
              phone_categories (
                name
              )
            )
          ),
          part_categories (name),
          part_types (name),
          spare_parts_colors (color_name, color_code)
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
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  const filteredParts = (spareParts || []).filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (part.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         part.phone_models?.spare_parts_brands?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || part.part_categories?.name === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="min-h-screen bg-background">
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
            Premium quality spare parts and accessories for all major phone brands
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-in">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search spare parts by name, brand, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(partCategories || []).map(category => (
                <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
              ))}
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
            </SelectContent>
          </Select>
        </div>

        {/* Parts Grid */}
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
