import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useInView } from "react-intersection-observer";
import { 
  FolderOpen, Smartphone, Laptop, Headphones, Wrench, Shield, 
  Package, Cpu, Monitor, Tv, Wind, UtensilsCrossed, Refrigerator
} from "lucide-react";

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

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
  return Package;
};

export function DynamicCategoriesSection() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ShopCategory[];
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="container">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-white/10 rounded w-48 mx-auto mb-4" />
              <div className="h-4 bg-white/10 rounded w-64 mx-auto" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section 
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container relative z-10">
        <div className={`text-center mb-12 transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm mb-6 border border-primary/30">
            <FolderOpen className="h-5 w-5 text-white" />
            <span className="text-white font-semibold">Browse Categories</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold mb-4 text-white animate-shimmer bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent bg-[length:200%_100%]">
            Shop by Category
          </h2>
          <p className="text-white/80 text-xl max-w-2xl mx-auto">
            Explore our wide range of products across all categories
          </p>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 transition-all duration-1000 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          {categories.map((category, index) => {
            const Icon = getCategoryIcon(category.name);
            return (
              <Link 
                key={category.id} 
                to={`/shop?category=${category.slug}`}
                className="group"
              >
                <Card 
                  className="h-full bg-white/5 backdrop-blur-xl border-primary/20 hover:border-primary/50 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-4 md:p-6 flex flex-col items-center text-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                      <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-white text-sm md:text-base leading-tight">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-white/60 text-xs mt-1 line-clamp-2 hidden md:block">
                        {category.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
