import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SparePartCard } from "./SparePartCard";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { Wrench, ArrowRight } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

export const FeaturedSparePartsSection = () => {
  const { data: spareParts, isLoading } = useQuery({
    queryKey: ['featured-spare-parts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts')
        .select(`
          *,
          phone_models (
            name,
            spare_parts_brands (
              name
            )
          ),
          part_categories (
            name
          )
        `)
        .eq('visible', true)
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!spareParts || spareParts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Spare Parts & Repair Parts</h2>
              <p className="text-muted-foreground mt-1">High-quality replacement parts for your devices</p>
            </div>
          </div>
          <Link to="/shop?category=spare-parts">
            <Button variant="outline" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {spareParts.map((part) => (
            <SparePartCard key={part.id} part={part} />
          ))}
        </div>
      </div>
    </section>
  );
};
