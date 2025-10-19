import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CartDrawer } from "@/components/CartDrawer";
import { storefrontApiRequest, GET_PRODUCT_BY_HANDLE_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Phone, ArrowLeft, ShoppingBag, Check } from "lucide-react";

const ProductDetail = () => {
  const { handle } = useParams();
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    if (handle) {
      fetchProduct();
    }
  }, [handle]);

  const fetchProduct = async () => {
    try {
      const data = await storefrontApiRequest(GET_PRODUCT_BY_HANDLE_QUERY, { handle });
      if (data?.data?.productByHandle) {
        const productData = { node: data.data.productByHandle };
        setProduct(productData);
        setSelectedVariant(data.data.productByHandle.variants.edges[0]?.node);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;

    const cartItem = {
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart!", {
      description: `${product.node.title} has been added to your cart`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Product not found</h2>
          <Link to="/">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const images = product.node.images.edges;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dilbar Mobile</h1>
              <p className="text-xs text-muted-foreground">Repair Shop</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <CartDrawer />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="aspect-square bg-muted">
                {images[selectedImage]?.node && (
                  <img
                    src={images[selectedImage].node.url}
                    alt={product.node.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </Card>
            
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((image, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image.node.url}
                      alt={`${product.node.title} ${idx + 1}`}
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
              <h1 className="text-3xl font-bold mb-2">{product.node.title}</h1>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">Wholesale Rate</Badge>
                <Badge variant="outline">Home Delivery</Badge>
              </div>
              <p className="text-3xl font-bold text-primary">
                {selectedVariant?.price.currencyCode}{' '}
                {parseFloat(selectedVariant?.price.amount || '0').toFixed(2)}
              </p>
            </div>

            {product.node.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{product.node.description}</p>
              </div>
            )}

            {/* Variant Selection */}
            {product.node.options.length > 0 && (
              <div className="space-y-4">
                {product.node.options.map((option) => (
                  <div key={option.name}>
                    <h3 className="font-semibold mb-2">{option.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const variant = product.node.variants.edges.find(
                          (v) => v.node.selectedOptions.some(
                            (opt) => opt.name === option.name && opt.value === value
                          )
                        )?.node;
                        
                        const isSelected = selectedVariant?.selectedOptions.some(
                          (opt) => opt.name === option.name && opt.value === value
                        );

                        return (
                          <Button
                            key={value}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => variant && setSelectedVariant(variant)}
                            disabled={!variant?.availableForSale}
                            className="relative"
                          >
                            {value}
                            {isSelected && <Check className="h-4 w-4 ml-2" />}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add to Cart */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!selectedVariant?.availableForSale}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  {selectedVariant?.availableForSale ? 'Add to Cart' : 'Out of Stock'}
                </Button>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Wholesale rates guaranteed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Free home delivery in Bahria Phase 7</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Quality assured</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
