import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { 
  ArrowRight, Smartphone, Wrench, Laptop, Headphones, 
  Package, Monitor, Shield, ShoppingCart, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";

// Map category names to icons
const getCategoryIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("phone") || lowerName.includes("mobile")) return Smartphone;
  if (lowerName.includes("laptop")) return Laptop;
  if (lowerName.includes("accessori") || lowerName.includes("headphone")) return Headphones;
  if (lowerName.includes("spare") || lowerName.includes("part")) return Wrench;
  if (lowerName.includes("protector") || lowerName.includes("skin")) return Shield;
  if (lowerName.includes("computer") || lowerName.includes("pc")) return Monitor;
  return Package;
};

// Get gradient based on index for alternating themes
const getGradient = (index: number) => {
  const gradients = [
    "from-slate-900 via-gray-900 to-black", // Dark
    "from-white via-blue-50 to-purple-50", // Light
    "from-gray-900 via-slate-900 to-gray-950", // Dark
    "from-purple-50 via-white to-blue-50", // Light
    "from-black via-gray-900 to-slate-900", // Dark
    "from-blue-50 via-purple-50 to-white", // Light
    "from-slate-950 via-gray-900 to-black", // Dark
    "from-white via-purple-50 to-blue-50", // Light
    "from-gray-900 via-black to-slate-900", // Dark
  ];
  return gradients[index % gradients.length];
};

const isDarkTheme = (index: number) => index % 2 === 0;

interface ShopItem {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  images: string[] | null;
  stock: number | null;
  description: string | null;
  category_id: string;
}

interface CategoryWithItems {
  id: string;
  name: string;
  slug: string;
  items: ShopItem[];
}

const CategorySection = ({ 
  category, 
  index 
}: { 
  category: CategoryWithItems; 
  index: number;
}) => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const isDark = isDarkTheme(index);
  const Icon = getCategoryIcon(category.name);
  const addItem = useProductCartStore((state) => state.addItem);

  const handleAddToCart = (item: ShopItem) => {
    if ((item.stock || 0) <= 0) {
      toast.error("Item is out of stock");
      return;
    }
    addItem({
      id: item.id,
      name: item.name,
      brand: "Shop Item",
      price: item.sale_price || item.price,
      images: item.images || ["/placeholder.svg"],
      type: "product",
    });
    toast.success(`${item.name} added to cart`);
  };

  if (category.items.length === 0) return null;

  return (
    <section 
      ref={ref}
      className={cn(
        "py-16 md:py-24 relative overflow-hidden bg-gradient-to-br",
        getGradient(index)
      )}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className={cn(
            "absolute top-10 left-1/4 w-96 h-96 rounded-full blur-3xl animate-float",
            isDark ? "bg-primary/15" : "bg-primary/10"
          )} 
        />
        <div 
          className={cn(
            "absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl animate-float",
            isDark ? "bg-accent/15" : "bg-accent/10"
          )} 
          style={{ animationDelay: '2s' }} 
        />
        {/* Floating particles */}
        <div className={cn(
          "absolute top-1/3 right-1/3 w-4 h-4 rounded-full animate-pulse-slow",
          isDark ? "bg-white/10" : "bg-primary/20"
        )} />
        <div className={cn(
          "absolute bottom-1/4 left-1/3 w-3 h-3 rounded-full animate-pulse-slow",
          isDark ? "bg-white/10" : "bg-accent/20"
        )} style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <div className={cn(
          "flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4 transition-all duration-1000",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
        )}>
          <div>
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm mb-4 border",
              isDark 
                ? "bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30" 
                : "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20"
            )}>
              <Icon className={cn("h-5 w-5", isDark ? "text-white" : "text-primary")} />
              <span className={cn(
                "font-semibold",
                isDark ? "text-white" : "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              )}>
                {category.name}
              </span>
              <Sparkles className={cn("h-4 w-4", isDark ? "text-accent" : "text-accent")} />
            </div>
            <h2 className={cn(
              "text-3xl md:text-5xl font-extrabold mb-2",
              isDark ? "text-white" : "bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
            )}>
              {category.name}
            </h2>
            <p className={cn(
              "text-lg",
              isDark ? "text-white/70" : "text-muted-foreground"
            )}>
              Top picks from our collection
            </p>
          </div>
          <Link to={`/shop?category=${category.slug}`}>
            <Button 
              size="lg" 
              className={cn(
                "shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300",
                isDark 
                  ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white" 
                  : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
              )}
            >
              View All <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Items Grid */}
        <div className={cn(
          "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 transition-all duration-1000 delay-300",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
        )}>
          {category.items.map((item, itemIndex) => (
            <Card 
              key={item.id}
              className={cn(
                "group relative overflow-hidden border-0 transition-all duration-500 animate-scale-in",
                isDark 
                  ? "bg-white/5 backdrop-blur-xl hover:bg-white/10" 
                  : "bg-white/80 backdrop-blur-xl hover:bg-white shadow-lg hover:shadow-xl"
              )}
              style={{ animationDelay: `${itemIndex * 0.1}s` }}
            >
              {/* Sale Badge */}
              {item.sale_price && item.sale_price < item.price && (
                <Badge className="absolute top-3 left-3 z-20 bg-red-500 text-white border-0 animate-pulse">
                  {Math.round(((item.price - item.sale_price) / item.price) * 100)}% OFF
                </Badge>
              )}

              {/* Stock Badge */}
              {(item.stock || 0) <= 0 && (
                <Badge className="absolute top-3 right-3 z-20 bg-gray-500 text-white border-0">
                  Out of Stock
                </Badge>
              )}

              {/* Image Container */}
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={item.images?.[0] || "/placeholder.svg"}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  isDark ? "from-black/60 to-transparent" : "from-black/40 to-transparent"
                )} />
                
                {/* Quick Add Button */}
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={(item.stock || 0) <= 0}
                  className={cn(
                    "absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full",
                    "flex items-center gap-2 text-sm font-medium",
                    "opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0",
                    "transition-all duration-300 backdrop-blur-md",
                    (item.stock || 0) <= 0 
                      ? "bg-gray-500/80 text-white cursor-not-allowed"
                      : "bg-white/90 text-gray-900 hover:bg-white"
                  )}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className={cn(
                  "font-semibold text-sm md:text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors",
                  isDark ? "text-white" : "text-foreground"
                )}>
                  {item.name}
                </h3>
                
                <div className="flex items-center gap-2">
                  {item.sale_price && item.sale_price < item.price ? (
                    <>
                      <span className={cn(
                        "font-bold text-lg",
                        isDark ? "text-green-400" : "text-green-600"
                      )}>
                        Rs. {item.sale_price.toLocaleString()}
                      </span>
                      <span className={cn(
                        "text-sm line-through",
                        isDark ? "text-white/50" : "text-muted-foreground"
                      )}>
                        Rs. {item.price.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className={cn(
                      "font-bold text-lg",
                      isDark ? "text-white" : "text-foreground"
                    )}>
                      Rs. {item.price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ShopCategoryShowcase = () => {
  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["shop-categories-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch items for all categories
  const { data: allItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["shop-items-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*")
        .eq("visible", true)
        .gt("stock", 0);
      if (error) throw error;
      return data || [];
    },
  });

  // Group items by category and get 4 random items from each
  const categoriesWithItems: CategoryWithItems[] = categories.map(cat => {
    const categoryItems = allItems.filter(item => item.category_id === cat.id);
    // Shuffle and pick 4 random items
    const shuffled = [...categoryItems].sort(() => Math.random() - 0.5);
    const randomItems = shuffled.slice(0, 4);
    
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      items: randomItems,
    };
  }).filter(cat => cat.items.length > 0);

  if (isLoadingCategories || isLoadingItems) {
    return (
      <section className="py-16 bg-gradient-to-br from-slate-900 to-black">
        <div className="container">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categoriesWithItems.length === 0) {
    return null;
  }

  return (
    <>
      {categoriesWithItems.map((category, index) => (
        <CategorySection 
          key={category.id} 
          category={category} 
          index={index} 
        />
      ))}
    </>
  );
};
