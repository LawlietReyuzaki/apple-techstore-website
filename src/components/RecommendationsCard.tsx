import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  brand: string;
}

interface RecommendationsCardProps {
  currentProductId?: string;
  categoryId?: string;
}

export const RecommendationsCard = ({ currentProductId, categoryId }: RecommendationsCardProps) => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      let query = supabase
        .from("products")
        .select("*")
        .limit(3);

      if (currentProductId) {
        query = query.neq("id", currentProductId);
      }

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data } = await query;
      if (data) setRecommendations(data);
    };

    fetchRecommendations();
  }, [currentProductId, categoryId]);

  if (recommendations.length === 0) return null;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">You May Be Interested In</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="block group"
          >
            <div className="flex gap-3 hover:bg-muted/50 p-2 rounded-lg transition-colors">
              <div className="w-20 h-20 bg-secondary/20 rounded-lg overflow-hidden flex-shrink-0">
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{product.brand}</p>
                <p className="text-sm font-bold text-primary mt-1">
                  Rs. {product.price.toLocaleString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
        <Link to="/shop">
          <Button variant="outline" className="w-full" size="sm">
            View All Products
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
