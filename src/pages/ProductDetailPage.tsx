import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, ArrowLeft, Package, Wrench } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductReviews } from "@/components/ProductReviews";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { useAuth } from "@/hooks/useAuth";
import { ProductSEO } from "@/components/ProductSEO";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addItem = useProductCartStore(state => state.addItem);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: productColors } = useQuery({
    queryKey: ["product-colors", id, product?.has_color_options],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_colors")
        .select("*")
        .eq("product_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id && product?.has_color_options === true,
  });

  const { data: productPartTypes } = useQuery({
    queryKey: ["product-part-types", id, product?.has_part_type_options],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_part_types")
        .select("*")
        .eq("product_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id && product?.has_part_type_options === true,
  });

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock <= 0) { toast.error("Out of stock"); return; }
    if (quantity > product.stock) { toast.error(`Only ${product.stock} items available`); return; }
    if (product.has_color_options && productColors && productColors.length > 0 && !selectedColor) {
      toast.error("Please select a color"); return;
    }
    if (product.has_part_type_options && productPartTypes && productPartTypes.length > 0 && !selectedPartType) {
      toast.error("Please select a part type"); return;
    }

    const selectedColorData = selectedColor ? productColors?.find(c => c.id === selectedColor) : null;
    const selectedPartTypeData = selectedPartType ? productPartTypes?.find(pt => pt.id === selectedPartType) : null;

    addItem(
      { id: product.id, name: product.name, brand: product.brand, price: product.price, wholesale_price: product.wholesale_price, images: product.images, type: 'product' }, 
      quantity,
      selectedColorData?.color_name || null,
      selectedColorData?.color_code || null,
      selectedPartTypeData?.part_type_name || null
    );
    toast.success("Added to cart", { description: `${quantity}x ${product.name}` });
  };

  const handleBuyNow = () => { handleAddToCart(); navigate("/cart"); };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" /><Skeleton className="h-6 w-24" /><Skeleton className="h-10 w-32" /><Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Button asChild><Link to="/shop">Back to Shop</Link></Button>
        </div>
      </div>
    );
  }

  const hasWholesale = product.wholesale_price && product.wholesale_price < product.price;
  const displayPrice = hasWholesale ? product.wholesale_price : product.price;

  return (
    <div className="min-h-screen bg-background">
      <ProductSEO
        name={product.name}
        description={product.description}
        price={product.price}
        salePrice={product.wholesale_price}
        brand={product.brand}
        image={product.images?.[0]}
        stock={product.stock || 0}
        url={`/product/${product.id}`}
        category={product.brand}
      />
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          <div className="space-y-4 animate-fade-in">
            <div className="aspect-square bg-secondary/20 rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package className="h-24 w-24 text-muted-foreground" /></div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, idx) => (
                  <button key={idx} onClick={() => setSelectedImage(idx)} className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-primary' : 'border-transparent'}`}>
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{product.brand}</Badge>
                    {product.featured && <Badge>Featured</Badge>}
                    {hasWholesale && <Badge className="bg-green-600">Wholesale Price</Badge>}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
                </div>
                <WishlistButton productId={product.id} userId={user?.id} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground"><Package className="h-4 w-4" /><span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">Rs. {displayPrice?.toLocaleString()}</span>
                {hasWholesale && <span className="text-xl text-muted-foreground line-through">Rs. {product.price.toLocaleString()}</span>}
              </div>
              {hasWholesale && <p className="text-sm text-green-600 font-medium">Save Rs. {(product.price - product.wholesale_price!).toLocaleString()} with wholesale pricing</p>}
            </div>
            {product.description && (<><Separator /><div><h3 className="font-semibold mb-2">Description</h3><p className="text-muted-foreground whitespace-pre-line">{product.description}</p></div></>)}

            {product.has_color_options && productColors && productColors.length > 0 && (
              <><Separator /><div className="space-y-3"><h3 className="font-semibold">Select Color <span className="text-destructive">*</span></h3><div className="flex flex-wrap gap-3">{productColors.map((color) => (<button key={color.id} onClick={() => setSelectedColor(color.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${selectedColor === color.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>{color.color_code && <span className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: color.color_code }} />}<span className="text-sm font-medium">{color.color_name}</span></button>))}</div></div></>
            )}

            {product.has_part_type_options && productPartTypes && productPartTypes.length > 0 && (
              <><Separator /><div className="space-y-3"><h3 className="font-semibold">Select Part Type <span className="text-destructive">*</span></h3><div className="flex flex-wrap gap-3">{productPartTypes.map((pt) => (<button key={pt.id} onClick={() => setSelectedPartType(pt.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${selectedPartType === pt.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}><Wrench className="h-4 w-4" /><span className="text-sm font-medium">{pt.part_type_name}</span></button>))}</div></div></>
            )}

            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium">Quantity:</label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={quantity >= product.stock}>+</Button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAddToCart} variant="outline" className="flex-1" disabled={product.stock <= 0}><ShoppingCart className="mr-2 h-4 w-4" />Add to Cart</Button>
                <Button onClick={handleBuyNow} className="flex-1" disabled={product.stock <= 0}>Buy Now</Button>
              </div>
            </div>
          </div>

          <div className="hidden md:block"><RecommendationsCard currentProductId={product.id} categoryId={product.category_id} /></div>
        </div>
        <div className="mt-12"><ProductReviews productId={product.id} userId={user?.id} /></div>
      </div>
    </div>
  );
}