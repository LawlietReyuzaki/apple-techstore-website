import { useQuery } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";

const SECTION_SIZE = 8;
const COLS = "id,slug,name,brand,price,sale_price,wholesale_price,stock,images,featured,on_sale";

/** Homepage: the newest phones from the "New & Used Phones" category (same source as the Used Phones page). */
export function UsedPhonesSection() {
  const { data: phones, isLoading } = useQuery({
    queryKey: ["home-used-phones", SECTION_SIZE],
    queryFn: async () => {
      const { data: cat, error: catErr } = await supabase
        .from("categories").select("id").eq("name", "New & Used Phones").limit(1);
      if (catErr) throw catErr;
      const categoryId = cat?.[0]?.id;
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("products").select(COLS)
        .eq("category_id", categoryId)
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(SECTION_SIZE);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-6 w-24" /></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />)}
        </div>
      </section>
    );
  }
  if (!phones || phones.length === 0) return null;

  return (
    <section>
      <SectionHeader icon={Smartphone} title="New & Used Phones" subtitle="Quality-checked phones with warranty" to="/phones" cta="All phones" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {phones.map((p: any) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
