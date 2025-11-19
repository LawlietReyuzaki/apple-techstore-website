import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";
import { WishlistButton } from "./WishlistButton";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  wholesale_price?: number;
  sale_price?: number;
  stock: number;
  images: string[];
  featured?: boolean;
  on_sale?: boolean;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { user } = useAuth();
  const addItem = useProductCartStore(state => state.addItem);
  
  // Prioritize sale_price over wholesale_price
  const hasSale = product.on_sale && product.sale_price && product.sale_price < product.price;
  const hasWholesale = !hasSale && product.wholesale_price && product.wholesale_price < product.price;
  const displayPrice = hasSale ? product.sale_price : (hasWholesale ? product.wholesale_price : product.price);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      wholesale_price: product.wholesale_price,
      sale_price: product.sale_price,
      images: product.images,
    });
    
    toast.success("Added to cart", {
      description: product.name,
    });
  };

  return (
    <Link to={`/product/${product.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-200 hover-scale overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square bg-secondary/20 overflow-hidden">
            <div className="absolute top-2 right-2 z-10">
              <WishlistButton productId={product.id} userId={user?.id} />
            </div>
            
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            
            {product.stock <= 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="destructive" className="text-lg">Out of Stock</Badge>
              </div>
            )}
            
            {product.featured && product.stock > 0 && !hasSale && (
              <Badge className="absolute top-2 left-2 bg-primary">Featured</Badge>
            )}
            
            {hasSale && product.stock > 0 && (
              <Badge className="absolute bottom-2 left-2 bg-red-600">
                {Math.round(((product.price - (product.sale_price || 0)) / product.price) * 100)}% OFF
              </Badge>
            )}
            
            {hasWholesale && product.stock > 0 && !hasSale && (
              <Badge className="absolute bottom-2 left-2 bg-green-600">Wholesale</Badge>
            )}
          </div>
          
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{product.brand}</Badge>
              <span className="text-xs text-muted-foreground">{product.stock} in stock</span>
            </div>
            
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                Rs. {displayPrice?.toLocaleString()}
              </span>
              {(hasSale || hasWholesale) && (
                <span className="text-sm text-muted-foreground line-through">
                  Rs. {product.price.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleAddToCart}
            className="w-full"
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};
