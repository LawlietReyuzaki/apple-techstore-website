import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Zap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FlashSaleProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  sale_price: number;
  stock: number;
  images: string[];
  featured?: boolean;
  on_sale: boolean;
}

export const FlashSaleSection = () => {
  const [saleProducts, setSaleProducts] = useState<FlashSaleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSaleProducts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('flash-sale-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: 'on_sale=eq.true',
        },
        () => {
          fetchSaleProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSaleProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("on_sale", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSaleProducts(data || []);
    } catch (error) {
      console.error("Error fetching sale products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-8 sm:py-12 md:py-16">
        <div className="container">
          <div className="text-center">
            <div className="inline-block animate-pulse bg-muted rounded-lg h-12 w-48 mb-4"></div>
          </div>
        </div>
      </section>
    );
  }

  if (saleProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12 md:py-16 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-red-500/5 to-pink-500/5 dark:from-orange-500/10 dark:via-red-500/10 dark:to-pink-500/10" />
      
      <div className="container relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500 animate-pulse" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Flash Sale
              </h2>
              <Badge variant="destructive" className="animate-pulse">
                Limited Time
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Grab these exclusive deals before they're gone!
            </p>
          </div>
          <Link to="/shop">
            <Button variant="outline" size="sm" className="w-full sm:w-auto border-orange-500/50 hover:bg-orange-500/10">
              View All Deals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {saleProducts.map((product) => (
            <div key={product.id} className="relative">
              {/* Sale badge */}
              <div className="absolute -top-2 -right-2 z-10">
                <Badge variant="destructive" className="animate-bounce">
                  {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
                </Badge>
              </div>
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        {saleProducts.length > 4 && (
          <div className="text-center mt-8">
            <Link to="/shop">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <Zap className="mr-2 h-5 w-5" />
                Explore All Flash Deals
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
