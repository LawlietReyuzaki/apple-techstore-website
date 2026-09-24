import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "./SectionHeader";
import { Zap } from "lucide-react";

export const FlashSaleSection = () => {
  const { data: saleProducts, isLoading } = useQuery({
    queryKey: ["sale-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,brand,price,sale_price,wholesale_price,stock,images,featured,on_sale")
        .eq("on_sale", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !saleProducts || saleProducts.length === 0) return null;

  return (
    <section className="rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4 md:p-5">
      <SectionHeader icon={Zap} title="Flash Sale" subtitle="Limited-time offers — while stock lasts" to="/shop" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {saleProducts.map((product) => (
          <div key={product.id} className="relative">
            <div className="absolute -top-2 -right-2 z-10 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow">
              {product.sale_price && product.price
                ? `${Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF`
                : "SALE"}
            </div>
            <ProductCard
              product={{
                ...product,
                // Use wholesale_price slot to show sale price (reuses existing UI pattern)
                wholesale_price: product.sale_price,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
