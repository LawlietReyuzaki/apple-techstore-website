import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, ArrowLeft, Package } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { ProductSEO } from "@/components/ProductSEO";

export default function ShopItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useProductCartStore(state => state.addItem);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { data: item, isLoading } = useQuery({
    queryKey: ["shop-item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*, shop_categories(id, name, slug), shop_brands(id, name)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const handleAddToCart = (): boolean => {
    if (!item) return false;
    
    if ((item.stock || 0) <= 0) {
      toast.error("This item is out of stock");
      return false;
    }

    // Auto-adjust quantity if exceeds stock
    const adjustedQuantity = Math.min(quantity, item.stock || 1);
    if (adjustedQuantity < quantity) {
      toast.info(`Quantity adjusted to ${adjustedQuantity} (max available)`);
    }

    addItem({
      id: item.id,
      name: item.name,
      brand: item.shop_brands?.name,
      price: item.sale_price || item.price,
      images: item.images || [],
      type: 'shop_item',
    }, adjustedQuantity);
    
    toast.success("Added to cart", {
      description: `${adjustedQuantity}x ${item.name}`,
    });
    return true;
  };

  const handleBuyNow = () => {
    const success = handleAddToCart();
    if (success) {
      navigate("/checkout");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Item not found</h2>
          <Button asChild>
            <Link to="/shop">Back to Shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOnSale = item.sale_price && item.sale_price < item.price;
  const displayPrice = isOnSale ? item.sale_price : item.price;
  const isOutOfStock = (item.stock || 0) <= 0;

  return (
    <div className="min-h-screen bg-background">
      <ProductSEO
        name={item.name}
        description={item.description}
        price={item.price}
        salePrice={item.sale_price}
        brand={item.shop_brands?.name || 'AppleTechStore'}
        image={item.images?.[0]}
        stock={item.stock || 0}
        url={`/shop-item/${item.id}`}
        category={item.shop_categories?.name}
      />
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4 animate-fade-in">
            <div className="aspect-square bg-secondary/20 rounded-lg overflow-hidden">
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[selectedImage]}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {item.images && item.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`${item.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {item.shop_brands && (
                  <Badge variant="outline">{item.shop_brands.name}</Badge>
                )}
                {item.shop_categories && (
                  <Badge variant="secondary">{item.shop_categories.name}</Badge>
                )}
                {item.featured && <Badge>Featured</Badge>}
                {isOnSale && <Badge className="bg-red-500">Sale</Badge>}
                {item.condition && (
                  <Badge 
                    variant="outline"
                    className={item.condition === 'used' 
                      ? 'border-orange-500 text-orange-500' 
                      : 'border-green-500 text-green-500'
                    }
                  >
                    {item.condition === 'used' ? 'Used' : 'New'}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{item.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{!isOutOfStock ? `${item.stock} in stock` : 'Out of stock'}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">
                  Rs. {displayPrice?.toLocaleString()}
                </span>
                {isOnSale && (
                  <span className="text-xl text-muted-foreground line-through">
                    Rs. {item.price.toLocaleString()}
                  </span>
                )}
              </div>
              {isOnSale && (
                <p className="text-sm text-red-500 font-medium">
                  Save Rs. {(item.price - (item.sale_price || 0)).toLocaleString()}
                </p>
              )}
            </div>

            {item.description && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{item.description}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium">Quantity:</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(item.stock || 1, quantity + 1))}
                    disabled={quantity >= (item.stock || 0)}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  className="flex-1"
                  disabled={isOutOfStock}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
                <Button
                  onClick={handleBuyNow}
                  className="flex-1"
                  disabled={isOutOfStock}
                >
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
