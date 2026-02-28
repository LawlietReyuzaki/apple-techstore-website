import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
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

  if (isLoading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8">Loading...</div>
        </div>
      </section>
    );
  }

  if (!saleProducts || saleProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full mb-4 animate-pulse">
            <Zap className="h-5 w-5 fill-current" />
            <span className="font-bold text-lg">FLASH SALE</span>
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Limited Time Offers!</h2>
          <p className="text-muted-foreground text-lg">
            Grab these amazing deals before they're gone
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {saleProducts.map((product) => (
            <div key={product.id} className="relative">
              <div className="absolute -top-2 -right-2 z-10 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-bounce">
                {product.sale_price && product.price
                  ? `${Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF`
                  : "SALE"}
              </div>
              <ProductCard
                product={{
                  ...product,
                  // Use wholesale_price slot to show sale price (reuses existing UI pattern)
                  wholesale_price: product.sale_price,
                  // Keep original price to show strikethrough
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
