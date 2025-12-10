import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { 
  Smartphone, Laptop, Headphones, Wrench, Shield, 
  Package, Cpu, Monitor, Tv, Wind, UtensilsCrossed, Refrigerator,
  Battery, Zap, Watch, Camera, Speaker, Keyboard, Mouse, ArrowRight, Sparkles
} from "lucide-react";

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url?: string | null;
  sort_order: number | null;
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
  if (lowerName.includes("power") || lowerName.includes("bank") || lowerName.includes("battery")) return Battery;
  if (lowerName.includes("charger") || lowerName.includes("cable")) return Zap;
  if (lowerName.includes("watch") || lowerName.includes("smart")) return Watch;
  if (lowerName.includes("camera")) return Camera;
  if (lowerName.includes("speaker") || lowerName.includes("audio")) return Speaker;
  if (lowerName.includes("keyboard")) return Keyboard;
  if (lowerName.includes("mouse")) return Mouse;
  return Package;
};

// Gradient colors for cards without images
const gradientColors = [
  "from-violet-500/20 via-purple-500/20 to-fuchsia-500/20",
  "from-cyan-500/20 via-blue-500/20 to-indigo-500/20",
  "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
  "from-amber-500/20 via-orange-500/20 to-red-500/20",
  "from-pink-500/20 via-rose-500/20 to-red-500/20",
  "from-indigo-500/20 via-violet-500/20 to-purple-500/20",
  "from-teal-500/20 via-emerald-500/20 to-green-500/20",
  "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
];

export function DynamicCategoriesSection() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["shop-categories-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ShopCategory[];
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('shop-categories-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_categories'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop-categories-home"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="container relative z-10">
          <div className="text-center mb-16">
            <Skeleton className="h-10 w-64 mx-auto mb-4 bg-muted/50" />
            <Skeleton className="h-5 w-96 mx-auto bg-muted/30" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-2xl bg-muted/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section 
      ref={ref}
      className="py-20 md:py-32 relative overflow-hidden"
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/5 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="container relative z-10">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Explore Our Collection</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            <span className="text-foreground">Shop by </span>
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              Category
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Discover premium products across our carefully curated categories
          </p>
        </div>

        {/* Categories Grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 transition-all duration-1000 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {categories.map((category, index) => {
            const Icon = getCategoryIcon(category.name);
            const hasImage = category.image_url && category.image_url.trim() !== '';
            const gradientClass = gradientColors[index % gradientColors.length];
            
            return (
              <Link 
                key={category.id} 
                to={`/shop?category=${category.slug}`}
                className="group relative block"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`
                  relative aspect-[4/3] rounded-2xl overflow-hidden
                  bg-gradient-to-br ${gradientClass}
                  border border-border/50 
                  transition-all duration-500 ease-out
                  group-hover:border-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/10
                  group-hover:scale-[1.02]
                `}>
                  {/* Background Image or Gradient */}
                  {hasImage ? (
                    <img 
                      src={category.image_url!} 
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20" />
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-end">
                    {/* Icon Badge */}
                    <div className="absolute top-3 right-3 md:top-4 md:right-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:scale-110">
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Text Content */}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-white text-base md:text-lg leading-tight line-clamp-2 transition-colors duration-300">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-white/60 text-xs md:text-sm line-clamp-1 hidden sm:block">
                          {category.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Arrow indicator */}
                    <div className="absolute bottom-4 right-4 md:bottom-5 md:right-5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All Link */}
        <div className={`text-center mt-12 transition-all duration-1000 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <Link 
            to="/shop" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-300 group"
          >
            <span>View All Products</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}