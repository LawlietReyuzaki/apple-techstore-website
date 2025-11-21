import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Package, Wrench } from "lucide-react";
import { useState } from "react";
import { useProductCartStore } from "@/stores/productCartStore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function SparePartDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const addItem = useProductCartStore((state) => state.addItem);
  const { toast } = useToast();

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
              name,
              phone_categories (
                name
              )
            )
          ),
          part_categories (name),
          part_types (name),
          spare_parts_colors (color_name, color_code)
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
      brand: part.phone_models.spare_parts_brands.name,
      price: part.price,
      images: part.images,
    }, 1);
    
    toast({
      title: "Added to Cart",
      description: `${part.name} has been added to your cart`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Spare Part Not Found</h2>
          <p className="text-muted-foreground mb-6">The spare part you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/spare-parts')}>
            Browse Spare Parts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
            <Link to="/spare-parts" className="text-primary font-medium">Spare Parts</Link>
            <Link to="/book-repair" className="hover:text-primary transition-colors">Repair</Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-secondary/20">
              {part.images[selectedImage] ? (
                <img
                  src={part.images[selectedImage]}
                  alt={part.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Wrench className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {part.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {part.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${part.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-2">
                {part.part_categories.name}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{part.name}</h1>
              <p className="text-lg text-muted-foreground">
                For {part.phone_models.spare_parts_brands.name} {part.phone_models.name}
              </p>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-primary">PKR {part.price}</span>
            </div>

            {part.description && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{part.description}</p>
                </CardContent>
              </Card>
            )}

            {part.spare_parts_colors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Available Colors</h3>
                <div className="flex flex-wrap gap-3">
                  {part.spare_parts_colors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-border"
                        style={{ backgroundColor: color.color_code || '#ccc' }}
                      />
                      <span className="text-sm">{color.color_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {part.part_types && (
              <div>
                <h3 className="font-semibold mb-2">Type</h3>
                <Badge>{part.part_types.name}</Badge>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className={part.stock > 0 ? "text-green-600" : "text-red-600"}>
                {part.stock > 0 ? `${part.stock} in stock` : "Out of stock"}
              </span>
            </div>

            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={part.stock === 0}
                className="flex-1"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleBuyNow}
                disabled={part.stock === 0}
                className="flex-1"
              >
                Buy Now
              </Button>
            </div>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Quality Guaranteed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  All spare parts are tested and come with quality assurance
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
