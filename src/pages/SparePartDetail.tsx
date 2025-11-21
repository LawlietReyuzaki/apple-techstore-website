import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function SparePartDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
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
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const handleAddToCart = () => {
    if (!part) return;
    
    addItem({
      id: part.id,
      name: part.name,
      brand: part.phone_models?.spare_parts_brands?.name || 'Generic',
      price: part.price,
      images: part.images,
    });
    toast.success(`${part.name} added to cart!`);
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

  const images = part.images && part.images.length > 0 ? part.images : ['/placeholder.svg'];

  return (
    <div className="min-h-screen bg-background">
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
                {part.stock <= 0 && (
                  <Badge variant="destructive">Out of Stock</Badge>
                )}
                {part.stock > 0 && part.stock <= 5 && (
                  <Badge className="bg-orange-500">Low Stock</Badge>
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
                  Rs. {part.price.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Description */}
            {part.description && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{part.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Part Type */}
            {part.part_types && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Part Type</h3>
                  <p className="text-muted-foreground">{part.part_types.name}</p>
                </CardContent>
              </Card>
            )}

            {/* Stock Status */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  {part.stock > 0 ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="font-medium">In Stock ({part.stock} available)</span>
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

            {/* Add to Cart */}
            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={part.stock <= 0}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
