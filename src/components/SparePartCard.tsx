import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles, CreditCard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
  part_types?: {
    id: string;
    name: string;
  };
  part_qualities?: {
    id: string;
    name: string;
  };
  spare_parts_colors?: {
    color_name: string;
    color_code: string | null;
  }[];
}

interface SparePartCardProps {
  part: SparePart;
}

export const SparePartCard = ({ part }: SparePartCardProps) => {
  const addItem = useProductCartStore(state => state.addItem);
  const navigate = useNavigate();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: part.id,
      name: part.name,
      brand: part.phone_models?.spare_parts_brands?.name || 'Generic',
      price: part.price,
      images: part.images,
      type: 'spare_part',
    });
    toast.success(`${part.name} added to cart!`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (part.stock <= 0) {
      toast.error("This item is out of stock");
      return;
    }
    addItem({
      id: part.id,
      name: part.name,
      brand: part.phone_models?.spare_parts_brands?.name || 'Generic',
      price: part.price,
      images: part.images,
      type: 'spare_part',
    });
    toast.success(`${part.name} added to cart!`);
    navigate("/checkout");
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
            <div className="flex flex-wrap gap-1">
              {part.part_categories && (
                <Badge variant="outline" className="text-xs">
                  {part.part_categories.name}
                </Badge>
              )}
              {part.part_types && (
                <Badge variant="secondary" className="text-xs">
                  {part.part_types.name}
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {part.name}
            </h3>
            
            {part.phone_models && (
              <p className="text-sm text-muted-foreground">
                For {part.phone_models.name}
              </p>
            )}
            
            {/* Quality Badge */}
            {part.part_qualities && (
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {part.part_qualities.name}
                </span>
              </div>
            )}
            
            {/* Available Colors */}
            {part.spare_parts_colors && part.spare_parts_colors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Colors:</span>
                <div className="flex gap-1">
                  {part.spare_parts_colors.slice(0, 4).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: color.color_code || '#888' }}
                      title={color.color_name}
                    />
                  ))}
                  {part.spare_parts_colors.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{part.spare_parts_colors.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {part.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {part.description}
              </p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <div className="flex items-center justify-between w-full">
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
          </div>
          <div className="flex gap-2 w-full">
            <Button 
              size="sm"
              variant="outline"
              onClick={handleAddToCart}
              disabled={part.stock <= 0}
              className="flex-1 gap-1"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Button>
            <Button 
              size="sm"
              onClick={handleBuyNow}
              disabled={part.stock <= 0}
              className="flex-1 gap-1"
            >
              <CreditCard className="h-4 w-4" />
              Buy Now
            </Button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};
