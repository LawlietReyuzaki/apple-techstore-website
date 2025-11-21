import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";

interface SparePart {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  description: string | null;
  featured: boolean | null;
  phone_models?: {
    name: string;
    spare_parts_brands?: {
      name: string;
    };
  };
  part_categories?: {
    name: string;
  };
}

interface SparePartCardProps {
  part: SparePart;
}

export const SparePartCard = ({ part }: SparePartCardProps) => {
  const addItem = useProductCartStore(state => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: part.id,
      name: part.name,
      brand: part.phone_models?.spare_parts_brands?.name || 'Generic',
      price: part.price,
      images: part.images,
    });
    toast.success(`${part.name} added to cart!`);
  };

  const imageUrl = part.images && part.images.length > 0 
    ? part.images[0] 
    : '/placeholder.svg';

  return (
    <Link to={`/spare-part/${part.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col overflow-hidden border-border/50">
        <div className="relative overflow-hidden bg-muted/30">
          <img
            src={imageUrl}
            alt={part.name}
            className="w-full h-64 object-contain group-hover:scale-105 transition-transform duration-300 p-4"
            loading="lazy"
          />
          {part.featured && (
            <Badge className="absolute top-2 left-2 bg-primary">
              Featured
            </Badge>
          )}
          {part.stock <= 0 && (
            <Badge className="absolute top-2 right-2 bg-destructive">
              Out of Stock
            </Badge>
          )}
          {part.stock > 0 && part.stock <= 5 && (
            <Badge className="absolute top-2 right-2 bg-orange-500">
              Low Stock
            </Badge>
          )}
        </div>
        
        <CardContent className="flex-1 p-4">
          <div className="space-y-2">
            {part.part_categories && (
              <Badge variant="outline" className="text-xs">
                {part.part_categories.name}
              </Badge>
            )}
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {part.name}
            </h3>
            {part.phone_models && (
              <p className="text-sm text-muted-foreground">
                For {part.phone_models.name}
              </p>
            )}
            {part.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {part.description}
              </p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
          <div>
            <p className="text-2xl font-bold text-primary">
              Rs. {part.price.toLocaleString()}
            </p>
            {part.stock > 0 && (
              <p className="text-xs text-muted-foreground">
                {part.stock} in stock
              </p>
            )}
          </div>
          <Button 
            size="sm"
            onClick={handleAddToCart}
            disabled={part.stock <= 0}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};
