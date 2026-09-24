import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Headphones, Laptop, Monitor, Shield, Smartphone, Tag, Wrench, Package } from "lucide-react";

interface ShopCategory { id: string; name: string; slug: string; image_url?: string | null; sort_order: number | null }

// Display order and short labels for the top category strip
const ORDER: Record<string, { label: string; icon: typeof Tag }> = {
  "mobile-spare-parts": { label: "Mobile Parts", icon: Wrench },
  "mobile-accessories": { label: "Mobile Accessories", icon: Headphones },
  "new-used-phones": { label: "New & Used Phones", icon: Smartphone },
  "laptop-computer-spare-parts": { label: "Laptop & PC Parts", icon: Laptop },
  "laptop-accessories": { label: "Laptop Accessories", icon: Laptop },
  "computer-accessories": { label: "Computer Accessories", icon: Monitor },
  "protector-skins": { label: "Protectors & Skins", icon: Shield },
};
const ORDER_KEYS = Object.keys(ORDER);

/** Compact, horizontally scrollable category strip shown right under the search bar. */
export function CategoryRow() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["shop-categories-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_categories").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ShopCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const sorted = [...(categories ?? [])].sort((a, b) => {
    const ia = ORDER_KEYS.indexOf(a.slug), ib = ORDER_KEYS.indexOf(b.slug);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const tiles = [
    ...sorted.map((c) => ({
      key: c.slug, to: `/shop?category=${c.slug}`,
      label: ORDER[c.slug]?.label ?? c.name, icon: ORDER[c.slug]?.icon ?? Package, image: c.image_url || null,
    })),
    { key: "brands", to: "/brands", label: "All Brands", icon: Tag, image: null },
    { key: "parts", to: "/parts", label: "All Parts", icon: Wrench, image: null },
  ];

  return (
    <nav aria-label="Shop by category" className="container py-3">
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 no-scrollbar">
        {isLoading
          ? [...Array(7)].map((_, i) => <Skeleton key={i} className="h-[76px] w-[96px] shrink-0 rounded-xl" />)
          : tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.key} to={t.to}
                className="snap-start shrink-0 w-[96px] sm:w-[110px] rounded-xl border border-border/60 bg-card p-2 flex flex-col items-center gap-1.5 hover:border-primary/50 hover:shadow-md transition-all">
                {t.image ? (
                  <img src={t.image} alt="" loading="lazy" className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <span className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></span>
                )}
                <span className="text-[11px] leading-tight text-center text-foreground line-clamp-2">{t.label}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
