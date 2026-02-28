import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/imageUrl";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number | null;
  images: string[] | null;
  featured: boolean | null;
  condition: string | null;
  shop_categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  shop_brands?: {
    id: string;
    name: string;
  } | null;
  _type?: 'shop_item' | 'product' | 'spare_part';
}

interface ShopItemCardProps {
  item: ShopItem;
}

const DEFAULT_PLACEHOLDER = "/placeholder.svg";

export function ShopItemCard({ item }: ShopItemCardProps) {
  const { addItem } = useProductCartStore();

  const imageUrl = item.images && item.images.length > 0
    ? getImageUrl(item.images[0])
    : DEFAULT_PLACEHOLDER;

  const isOnSale = item.sale_price && item.sale_price < item.price;
  const displayPrice = isOnSale ? item.sale_price : item.price;
  const isOutOfStock = (item.stock || 0) <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock) {
      toast.error("This item is out of stock");
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      brand: item.shop_brands?.name,
      price: displayPrice || item.price,
      images: item.images || [],
      type: item._type || 'shop_item'
    });
    
    toast.success(`${item.name} added to cart`);
  };

  // Determine the correct link based on item type
  const getItemLink = () => {
    switch (item._type) {
      case 'product':
        return `/product/${item.id}`;
      case 'spare_part':
        return `/spare-part/${item.id}`;
      case 'shop_item':
      default:
        return `/shop-item/${item.id}`;
    }
  };

  return (
    <Link to={getItemLink()}>
      <Card className="group h-full overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER;
            }}
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOnSale && (
              <Badge className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5">
                {Math.round(((item.price - (item.sale_price || 0)) / item.price) * 100)}% OFF
              </Badge>
            )}
            {item.featured && (
              <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                Featured
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs px-2 py-0.5">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Category badge */}
          {item.shop_categories && (
            <Badge 
              variant="outline" 
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-xs border-border/50"
            >
              {item.shop_categories.name}
            </Badge>
          )}

          {/* Quick add button */}
          <Button
            size="icon"
            variant="secondary"
            className={`absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 ${
              isOutOfStock ? 'cursor-not-allowed opacity-50' : ''
            }`}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <CardContent className="p-3 md:p-4 space-y-2">
          {/* Brand */}
          {item.shop_brands && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {item.shop_brands.name}
            </p>
          )}
          
          {/* Name */}
          <h3 className="font-semibold text-foreground text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors">
            {item.name}
          </h3>

          {/* Condition Badge - Show for phones in New & Used Phones category */}
          {item.condition && item.shop_categories?.slug === 'new-used-phones' && (
            <Badge 
              variant="outline" 
              className={`text-xs capitalize ${
                item.condition === 'used' 
                  ? 'border-orange-500 text-orange-500 bg-orange-500/10' 
                  : 'border-green-500 text-green-500 bg-green-500/10'
              }`}
            >
              {item.condition === 'used' ? 'Used' : 'New'}
            </Badge>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-lg md:text-xl font-bold text-primary">
              Rs. {displayPrice?.toLocaleString()}
            </span>
            {isOnSale && (
              <span className="text-sm text-muted-foreground line-through">
                Rs. {item.price.toLocaleString()}
              </span>
            )}
          </div>

          {/* Stock indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className={isOutOfStock ? 'text-red-500' : 'text-green-600'}>
              {isOutOfStock ? 'Out of Stock' : `${item.stock} in stock`}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}