import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CartDrawer } from "@/components/CartDrawer";
import { storefrontApiRequest, GET_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Phone, MapPin, Truck, Shield, Star, Zap, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await storefrontApiRequest(GET_PRODUCTS_QUERY, { first: 50 });
      setProducts(data?.data?.products?.edges || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: ShopifyProduct) => {
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) return;

    const cartItem = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart!", {
      description: `${product.node.title} has been added to your cart`,
    });
  };

  const brands = ["Apple", "Samsung", "Google", "Huawei", "Xiaomi", "Vivo", "Oppo"];

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
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
            <Link to="#products" className="text-sm font-medium hover:text-primary transition-colors">Products</Link>
            <Link to="#services" className="text-sm font-medium hover:text-primary transition-colors">Services</Link>
            <Link to="#contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Phone className="h-4 w-4 mr-2" />
              Call Us
            </Button>
            <CartDrawer />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge className="mb-4" variant="secondary">
              <Star className="h-3 w-3 mr-1" />
              Best Repair Shop in Bahria Phase 7
            </Badge>
            
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Your Trusted
              <span className="block text-primary">Mobile Repair Expert</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional repair services & wholesale rate phones. Home delivery available across Bahria Phase 7.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-6">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="h-5 w-5" />
                Shop Now
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <Phone className="h-5 w-5" />
                Book Repair
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Home Delivery</h3>
                <p className="text-sm text-muted-foreground">Free delivery in Bahria Phase 7</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-semibold">Wholesale Rates</h3>
                <p className="text-sm text-muted-foreground">Best prices guaranteed</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Quality Assured</h3>
                <p className="text-sm text-muted-foreground">Certified technicians</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-semibold">Bahria Phase 7</h3>
                <p className="text-sm text-muted-foreground">Convenient location</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Supported Brands */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-center mb-8">We Support All Major Brands</h3>
          <div className="flex flex-wrap justify-center gap-6">
            {brands.map((brand) => (
              <Badge key={brand} variant="outline" className="px-6 py-3 text-base">
                {brand}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground">Browse our collection of quality phones at wholesale rates</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : products.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">
                We're currently setting up our inventory. Check back soon!
              </p>
              <p className="text-sm text-muted-foreground">
                Want to add a product? Tell us what you need in the chat!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.node.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                  <Link to={`/product/${product.node.handle}`}>
                    <div className="aspect-square bg-muted overflow-hidden">
                      {product.node.images.edges[0]?.node && (
                        <img
                          src={product.node.images.edges[0].node.url}
                          alt={product.node.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4 space-y-3">
                    <Link to={`/product/${product.node.handle}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                        {product.node.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.node.description || "Quality product at wholesale rate"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">
                        {product.node.priceRange.minVariantPrice.currencyCode}{' '}
                        {parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)}
                      </span>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddToCart(product)}
                        className="gap-2"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground">Professional repair services for all devices</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Screen Repair</h3>
                <p className="text-muted-foreground">
                  Expert screen replacement for all phone models. Same-day service available.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold">Battery Replacement</h3>
                <p className="text-muted-foreground">
                  Genuine battery replacements with warranty. Get your phone back to full power.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Water Damage</h3>
                <p className="text-muted-foreground">
                  Professional water damage recovery. Save your device and data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Get In Touch</h2>
                <p className="text-muted-foreground">Visit us or call for inquiries</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Location</h4>
                    <p className="text-muted-foreground">Bahria Phase 7, Rawalpindi</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-muted-foreground">Contact us for best deals</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Truck className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Home Delivery</h4>
                    <p className="text-muted-foreground">Free delivery within Bahria Phase 7</p>
                  </div>
                </div>
              </div>

              <Button className="w-full" size="lg">
                <Phone className="h-5 w-5 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Dilbar Mobile Repair Shop. Best in Bahria Phase 7.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
