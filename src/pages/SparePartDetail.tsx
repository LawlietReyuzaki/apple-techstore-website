import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Check, AlertCircle, Sparkles, CreditCard, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ProductSEO } from "@/components/ProductSEO";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getImageUrls } from "@/lib/imageUrl";

interface Variant {
  id: string;
  variant_name: string;
  price: number;
  stock: number;
  sort_order: number;
}

export default function SparePartDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const addItem = useProductCartStore(state => state.addItem);

  const { data: part, isLoading } = useQuery({
    queryKey: ['spare-part', id],
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
          ),
          part_types (
            name
          ),
          part_qualities (
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch colors separately (one-to-many — not supported by the main query builder)
  const { data: colors = [] } = useQuery({
    queryKey: ['spare-part-colors', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts_colors')
        .select('*')
        .eq('spare_part_id', id);
      if (error) throw error;
      return data as { id: string; color_name: string; color_code: string }[];
    },
    enabled: !!id
  });

  // Fetch variants
  const { data: variants = [] } = useQuery({
    queryKey: ['spare-part-variants', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_part_variants')
        .select('*')
        .eq('spare_part_id', id)
        .order('sort_order');
      
      if (error) throw error;
      return data as Variant[];
    },
    enabled: !!id
  });

  // Auto-select first variant if available
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
  }, [variants, selectedVariant]);

  const hasVariants = variants.length > 0;
  const displayPrice = selectedVariant ? selectedVariant.price : part?.price || 0;
  const displayStock = selectedVariant ? selectedVariant.stock : part?.stock || 0;

  const handleAddToCart = (): boolean => {
    if (!part) return false;
    
    // Validate variant selection if required
    if (hasVariants && !selectedVariant) {
      toast.error("Please select a variant");
      return false;
    }
    
    // Validate color selection if required
    if (part.has_color_options && colors.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return false;
    }

    // Check stock
    if (displayStock <= 0) {
      toast.error("This item is out of stock");
      return false;
    }

    const selectedColorData = selectedColor
      ? colors.find((c) => c.id === selectedColor)
      : null;
    
    addItem(
      {
        id: part.id,
        name: part.name,
        brand: part.phone_models?.spare_parts_brands?.name || 'Generic',
        price: displayPrice,
        images: part.images,
        type: 'spare_part',
      },
      1,
      selectedColorData?.color_name || null,
      selectedColorData?.color_code || null,
      selectedVariant?.variant_name || null
    );
    toast.success(`${part.name}${selectedVariant ? ` (${selectedVariant.variant_name})` : ''} added to cart!`);
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
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-96 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Spare Part Not Found</h1>
          <p className="text-muted-foreground mb-4">The spare part you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/spare-parts')}>Browse Spare Parts</Button>
        </div>
      </div>
    );
  }

  const images = getImageUrls(part.images);
  const brandName = part.phone_models?.spare_parts_brands?.name || 'Generic';
  const categoryName = part.part_categories?.name || 'Spare Parts';

  return (
    <div className="min-h-screen bg-background">
      <ProductSEO
        name={part.name}
        description={part.description}
        price={displayPrice}
        brand={brandName}
        image={images[0] !== '/placeholder.svg' ? images[0] : null}
        stock={displayStock}
        url={`/spare-part/${part.id}`}
        category={categoryName}
      />
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg border bg-muted/30 overflow-hidden">
              <img
                src={images[selectedImage]}
                alt={part.name}
                className="w-full h-full object-contain p-8"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg border overflow-hidden transition-all ${
                      selectedImage === idx ? 'ring-2 ring-primary' : 'hover:border-primary'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${part.name} - ${idx + 1}`}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {part.part_categories && (
                  <Badge variant="outline">{part.part_categories.name}</Badge>
                )}
                {part.featured && (
                  <Badge className="bg-primary">Featured</Badge>
                )}
                {displayStock <= 0 && (
                  <Badge variant="destructive">Out of Stock</Badge>
                )}
                {displayStock > 0 && displayStock <= 5 && (
                  <Badge className="bg-orange-500">Low Stock</Badge>
                )}
                {hasVariants && (
                  <Badge variant="secondary" className="gap-1">
                    <Package className="h-3 w-3" />
                    {variants.length} Options
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{part.name}</h1>
              
              {part.phone_models && (
                <p className="text-lg text-muted-foreground mb-4">
                  Compatible with {part.phone_models.name}
                  {part.phone_models.spare_parts_brands && 
                    ` (${part.phone_models.spare_parts_brands.name})`
                  }
                </p>
              )}

              <div className="flex items-baseline gap-2 mb-6">
                <p className="text-4xl font-bold text-primary">
                  Rs. {displayPrice.toLocaleString()}
                </p>
                {hasVariants && selectedVariant && (
                  <span className="text-muted-foreground">({selectedVariant.variant_name})</span>
                )}
              </div>
            </div>

            {/* Variant Selection */}
            {hasVariants && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Select Option <span className="text-destructive">*</span>
                  </h3>
                  <RadioGroup
                    value={selectedVariant?.id || ''}
                    onValueChange={(value) => {
                      const variant = variants.find(v => v.id === value);
                      setSelectedVariant(variant || null);
                    }}
                    className="space-y-2"
                  >
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedVariant?.id === variant.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedVariant(variant)}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={variant.id} id={variant.id} />
                          <Label htmlFor={variant.id} className="cursor-pointer font-medium">
                            {variant.variant_name}
                          </Label>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">Rs. {variant.price.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Description */}
            {part.description && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{part.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Part Type & Quality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {part.part_types && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Part Type</h3>
                    <p className="text-muted-foreground">{part.part_types.name}</p>
                  </CardContent>
                </Card>
              )}
              
              {part.part_qualities && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Quality
                    </h3>
                    <p className="text-amber-600 dark:text-amber-400 font-medium">{part.part_qualities.name}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Color Selection */}
            {part.has_color_options && colors.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">Select Color <span className="text-destructive">*</span></h3>
                  <div className="flex flex-wrap gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                          selectedColor === color.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {color.color_code && (
                          <span
                            className="w-5 h-5 rounded-full border border-border"
                            style={{ backgroundColor: color.color_code }}
                          />
                        )}
                        <span className="text-sm font-medium">{color.color_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Display-only colors (when color options not enabled but colors exist) */}
            {!part.has_color_options && colors.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Available Colors</h3>
                  <div className="flex flex-wrap gap-3">
                    {colors.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                        <div
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: color.color_code || '#888' }}
                        />
                        <span className="text-sm font-medium">{color.color_name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock Status */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  {displayStock > 0 ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="font-medium">In Stock ({displayStock} available)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <span className="font-medium text-destructive">Out of Stock</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add to Cart & Buy Now */}
            <div className="flex gap-4">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={displayStock <= 0}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={handleBuyNow}
                disabled={displayStock <= 0}
              >
                <CreditCard className="h-5 w-5" />
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}