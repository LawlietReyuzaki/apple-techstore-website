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
    <nav aria-label="Shop by category" className="container xl:pr-14 py-3">
      {/* Phones/tablets: horizontal scroll. Desktop: the tiles spread across the full content width. */}
      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 no-scrollbar lg:grid lg:grid-cols-9 lg:gap-3 lg:overflow-visible">
        {isLoading
          ? [...Array(9)].map((_, i) => <Skeleton key={i} className="h-[104px] w-[120px] lg:w-auto shrink-0 rounded-xl" />)
          : tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.key} to={t.to}
                className="snap-start shrink-0 w-[120px] lg:w-auto rounded-xl border border-border/60 bg-card px-2 py-3 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:shadow-md transition-all">
                {t.image ? (
                  <img src={t.image} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <span className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-6 w-6 text-primary" /></span>
                )}
                <span className="text-[13px] md:text-sm font-medium leading-tight text-center text-foreground line-clamp-2">{t.label}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
