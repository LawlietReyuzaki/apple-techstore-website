import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { ShoppingCart, Search, ArrowLeft, Headphones } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";

const SUBCATEGORIES = [
  { value: "all", label: "All Accessories" },
  { value: "mobile", label: "Mobile Accessories" },
  { value: "laptop", label: "Laptop Accessories" },
  { value: "pc", label: "PC Accessories" },
  { value: "computer", label: "Computer Accessories" },
];

export default function Accessories() {
  const { subcategory } = useParams<{ subcategory?: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubcategory, setActiveSubcategory] = useState(subcategory || "all");
  const [sortBy, setSortBy] = useState("newest");
  const cartItemsCount = useProductCartStore((state) => state.getTotalItems());

  const { data: accessoriesCategory } = useQuery({
    queryKey: ["accessories-category"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id")
        .eq("name", "Accessories")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["accessories", accessoriesCategory?.id],
    queryFn: async () => {
      if (!accessoriesCategory?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", accessoriesCategory.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!accessoriesCategory?.id,
  });

  const filteredProducts = products
    ?.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubcategory =
        activeSubcategory === "all" || (p as any).accessory_subcategory === activeSubcategory;
      return matchesSearch && matchesSubcategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price_low":
          return a.price - b.price;
        case "price_high":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-background">
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
            <h1 className="text-xl font-bold">Accessories</h1>
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

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-500/10 to-teal-500/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <Headphones className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Accessories</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Complete your tech setup with our wide range of accessories for mobile, laptop, PC, and computers.
          </p>
        </div>
      </section>

      {/* Subcategory Tabs */}
      <section className="container mx-auto px-4 py-6">
        <Tabs value={activeSubcategory} onValueChange={setActiveSubcategory} className="w-full">
          <TabsList className="w-full flex flex-wrap justify-start gap-1 h-auto p-1">
            {SUBCATEGORIES.map((sub) => (
              <TabsTrigger key={sub.value} value={sub.value} className="flex-shrink-0">
                {sub.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 pb-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accessories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 pb-12">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No accessories found</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSearchTerm(""); setActiveSubcategory("all"); }}>
              Clear Filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
