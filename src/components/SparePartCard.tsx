import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { useToast } from "@/hooks/use-toast";

interface SparePart {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  phone_models: {
    name: string;
    spare_parts_brands: {
      name: string;
      phone_categories: {
        name: string;
      };
    };
  };
  part_categories: {
    name: string;
  };
  part_types?: {
    name: string;
  } | null;
  spare_parts_colors: {
    color_name: string;
    color_code: string;
  }[];
}

interface SparePartCardProps {
  part: SparePart;
}

export const SparePartCard = ({ part }: SparePartCardProps) => {
  const addItem = useProductCartStore((state) => state.addItem);
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({
      id: part.id,
      name: part.name,
      brand: part.phone_models.spare_parts_brands.name,
      price: part.price,
      images: part.images,
    }, 1);
    
    toast({
      title: "Added to Cart",
      description: `${part.name} has been added to your cart`,
    });
  };

  return (
    <Link to={`/spare-part/${part.id}`}>
      <Card className="glass-effect overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 h-full">
        <div className="aspect-square relative overflow-hidden bg-secondary/20">
          {part.images[0] ? (
            <img
              src={part.images[0]}
              alt={part.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground">No Image</span>
            </div>
          )}
          {part.stock === 0 && (
            <Badge className="absolute top-2 right-2 bg-destructive">Out of Stock</Badge>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="mb-2">
            <Badge variant="outline" className="text-xs">
              {part.part_categories.name}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{part.name}</h3>
          
          <p className="text-sm text-muted-foreground mb-2">
            {part.phone_models.spare_parts_brands.name} {part.phone_models.name}
          </p>
          
          {part.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {part.description}
            </p>
          )}
          
          {part.spare_parts_colors.length > 0 && (
            <div className="flex gap-2 mb-3">
              {part.spare_parts_colors.slice(0, 4).map((color, idx) => (
                <div
                  key={idx}
                  className="w-6 h-6 rounded-full border-2 border-border"
                  style={{ backgroundColor: color.color_code || '#ccc' }}
                  title={color.color_name}
                />
              ))}
              {part.spare_parts_colors.length > 4 && (
                <div className="w-6 h-6 rounded-full border-2 border-border bg-muted flex items-center justify-center text-xs">
                  +{part.spare_parts_colors.length - 4}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4">
            <span className="text-xl font-bold text-primary">PKR {part.price}</span>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={part.stock === 0}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
