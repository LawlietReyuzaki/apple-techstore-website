import { useParams, Link, useNavigate } from "react-router-dom";
import { StoreHeader } from "@/components/StoreHeader";
import { SiteFooter } from "@/components/SiteFooter";
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
import { TrackViewContent } from "@/components/MetaPixel";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getImageUrls } from "@/lib/imageUrl";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHATSAPP_NUMBER = "923342228141";

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
        // URL may be the SEO slug or (legacy) the UUID
        .eq(UUID_RE.test(id || '') ? 'id' : 'slug', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Colors/variants are keyed by the part's real UUID, not the URL segment
  const partId: string | undefined = part?.id;

  // Fetch colors separately (one-to-many — not supported by the main query builder)
  const { data: colors = [] } = useQuery({
    queryKey: ['spare-part-colors', partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts_colors')
        .select('*')
        .eq('spare_part_id', partId);
      if (error) throw error;
      return data as { id: string; color_name: string; color_code: string }[];
    },
    enabled: !!partId
  });

  // Fetch variants
  const { data: variants = [] } = useQuery({
    queryKey: ['spare-part-variants', partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_part_variants')
        .select('*')
        .eq('spare_part_id', partId)
        .order('sort_order');

      if (error) throw error;
      return data as Variant[];
    },
    enabled: !!partId
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
      <StoreHeader />
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
  const pageUrl = `/spare-part/${part.slug || part.id}`;
  const whatsappText =
    `Hi AppleTechStore, I want to order:\n${part.name}` +
    `${selectedVariant ? ` (${selectedVariant.variant_name})` : ''}\n` +
    `Price: Rs. ${Number(displayPrice).toLocaleString()}\n` +
    `https://appletechstore.pk${pageUrl}`;

  return (
    <div className="min-h-screen bg-background">
      <TrackViewContent id={part.id} name={part.name} price={displayPrice} />
      <ProductSEO
        name={part.name}
        description={part.description}
        price={displayPrice}
        brand={brandName}
        image={images[0] !== '/placeholder.svg' ? images[0] : null}
        stock={displayStock}
        url={pageUrl}
        category={categoryName}
      />
      {/* Header */}
      <StoreHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb — real links, matches the BreadcrumbList structured data */}
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span aria-hidden="true">›</span>
          <Link to="/spare-parts" className="hover:text-primary">Spare Parts</Link>
          <span aria-hidden="true">›</span>
          <span className="text-foreground/80 line-clamp-1">{part.name}</span>
        </nav>

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
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] font-semibold text-white transition-colors hover:bg-[#1ebe5b]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>
              Order on WhatsApp
            </a>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}