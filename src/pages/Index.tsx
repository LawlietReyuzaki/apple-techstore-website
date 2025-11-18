import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCartButton } from "@/components/ProductCartButton";
import { AuthButton } from "@/components/AuthButton";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TrustBar } from "@/components/TrustBar";
import { BrandSection } from "@/components/BrandSection";
import { ProductFilters } from "@/components/ProductFilters";
import { ContactSection } from "@/components/ContactSection";
import { ProductCard } from "@/components/ProductCard";
import { NotificationBell } from "@/components/NotificationBell";
import { PaymentMethodsStrip } from "@/components/PaymentMethodsStrip";
import { PromoSection } from "@/components/PromoSection";
import { WholesaleBanner } from "@/components/WholesaleBanner";
import { FeaturesStrip } from "@/components/FeaturesStrip";
import { DevicesCarousel } from "@/components/DevicesCarousel";
import { DeviceCard } from "@/components/DeviceCard";
import { useAuth } from "@/hooks/useAuth";
import { storefrontApiRequest, GET_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/integrations/supabase/client";
import { devices, Device } from "@/data/devices";
import { toast } from "sonner";
import { Phone, ShoppingBag, Search, Menu, Wrench, Filter, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

const Index = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [displayedDevices, setDisplayedDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    brands: [] as string[],
    availability: "all" as "all" | "available" | "coming-soon",
    priceRange: [0, 500000] as [number, number],
  });
  const addItem = useCartStore(state => state.addItem);

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    fetchProducts();
    fetchLocalProducts();
    // Initialize with randomized devices
    setDisplayedDevices(shuffleArray(devices).slice(0, 6));
  }, []);

  // Apply filters to devices
  useEffect(() => {
    let filtered = [...devices];

    // Apply brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(device => 
        filters.brands.includes(device.brand)
      );
    }

    // Apply availability filter
    if (filters.availability === "available") {
      filtered = filtered.filter(device => device.available);
    } else if (filters.availability === "coming-soon") {
      filtered = filtered.filter(device => !device.available);
    }

    // Apply price range filter
    filtered = filtered.filter(device => 
      device.price >= filters.priceRange[0] && 
      device.price <= filters.priceRange[1]
    );

    // Randomize and limit to 6 devices
    setDisplayedDevices(shuffleArray(filtered).slice(0, 6));
  }, [filters]);

  const fetchLocalProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .limit(4);

      if (error) throw error;
      setLocalProducts(data || []);
    } catch (error) {
      console.error('Error fetching local products:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await storefrontApiRequest(GET_PRODUCTS_QUERY, { first: 20 });
      if (data?.data?.products?.edges) {
        setProducts(data.data.products.edges);
      }
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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.node.title.toLowerCase().includes(searchQuery.toLowerCase());
    const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
    const matchesPrice = price >= filters.priceRange[0] && price <= filters.priceRange[1];
    
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-black/40 backdrop-blur-md text-white py-2 border-b border-primary/20">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm">
          <span>🎉 Welcome to Dilbar Mart - Wholesale Rates & Expert Repairs</span>
          <span className="hidden md:block">📞 Free Home Delivery in Bahria Phase 7</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/20 shadow-lg shadow-primary/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Dilbar Mart" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-white">
                Dilbar Mart
              </h1>
              <p className="text-xs text-primary">Wholesale & Repair Shop</p>
            </div>
          </Link>
          
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phones, brands, models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/shop">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop
              </Button>
            </Link>
            <Link to="/book-repair">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Wrench className="h-4 w-4 mr-2" />
                Repairs
              </Button>
            </Link>
            <NotificationBell userId={user?.id} />
            <AuthButton />
            <CartDrawer />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Link to="/book-repair">
                    <Button className="w-full" variant="outline">
                      <Wrench className="h-4 w-4 mr-2" />
                      Book Repair
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Wholesale Hero Banner */}
      <WholesaleBanner />

      {/* Features Strip */}
      <FeaturesStrip />

      {/* Hero Carousel */}
      <div className="container mx-auto px-4 py-6">
        <HeroCarousel />
      </div>

      {/* Promo Section with Repair & Parts Banners */}
      <PromoSection />

      {/* Trust Bar */}
      <TrustBar />

      {/* Brand Section */}
      <BrandSection />

      {/* Premium Devices Carousel */}
      <DevicesCarousel />

      {/* Featured Products from Local Inventory */}
      {localProducts.length > 0 && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Deals</h2>
                <p className="text-muted-foreground">Wholesale prices on premium phones</p>
              </div>
              <Link to="/shop">
                <Button variant="outline">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {localProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Our Products Section - Devices from Shop */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Our Products
              </h2>
              <p className="text-muted-foreground">
                {displayedDevices.length} premium devices with competitive pricing
              </p>
            </div>
            <div className="flex gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Products</SheetTitle>
                    <SheetDescription>
                      Refine your search by brand, availability, and price range
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <ProductFilters filters={filters} onFilterChange={setFilters} />
                  </div>
                </SheetContent>
              </Sheet>
              <Link to="/shop">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Desktop Filters */}
            <div className="hidden md:block">
              <ProductFilters filters={filters} onFilterChange={setFilters} />
            </div>

            {/* Devices Grid */}
            <div className="md:col-span-3">
              {displayedDevices.length === 0 ? (
                <Card className="p-12 text-center">
                  <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-2xl font-bold mb-2">No Devices Found</h3>
                  <p className="text-muted-foreground mb-6">
                    Try adjusting your filters to see more devices
                  </p>
                  <Button onClick={() => setFilters({
                    brands: [],
                    availability: "all",
                    priceRange: [0, 500000]
                  })}>
                    Reset Filters
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 animate-fade-in">
                  {displayedDevices.map((device) => (
                    <DeviceCard key={device.id} device={device} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Our Services
            </h2>
            <p className="text-muted-foreground text-lg">
              More than just a phone shop
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="glass-card text-center p-6 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border-primary/30 group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Wholesale Phones</h3>
              <p className="text-muted-foreground mb-4">
                New, used, and refurbished phones from all major brands at unbeatable wholesale prices.
              </p>
              <Button variant="outline">Shop Now</Button>
            </Card>

            <Link to="/book-repair" className="group">
              <Card className="glass-card text-center p-6 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border-primary/30 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Wrench className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Expert Repairs</h3>
                <p className="text-muted-foreground mb-4">
                  Professional repairs, quick turnaround, and warranty included on all services.
                </p>
                <Button variant="outline" className="border-primary/50 hover:bg-primary hover:text-white">Book Repair</Button>
              </Card>
            </Link>

            <Card className="glass-card text-center p-6 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border-primary/30 group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sell Your Phone</h3>
              <p className="text-muted-foreground mb-4">
                Get instant cash for your old phone. Fair prices and quick transactions guaranteed.
              </p>
              <Button variant="outline">Get Quote</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      {/* Payment Methods */}
      <PaymentMethodsStrip />

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Dilbar Mobiles</h3>
              <p className="text-white/80 text-sm">
                Your trusted partner for wholesale phones and professional repairs in Bahria Phase 7.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Shop</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="#" className="hover:text-white">New Phones</a></li>
                <li><a href="#" className="hover:text-white">Used Phones</a></li>
                <li><a href="#" className="hover:text-white">Accessories</a></li>
                <li><a href="#" className="hover:text-white">Parts</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="#" className="hover:text-white">Phone Repair</a></li>
                <li><a href="#" className="hover:text-white">Screen Replacement</a></li>
                <li><a href="#" className="hover:text-white">Battery Service</a></li>
                <li><a href="#" className="hover:text-white">Sell Your Phone</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li>Bahria Phase 7, Rawalpindi</li>
                <li>Phone: +92 XXX XXXXXXX</li>
                <li>Email: info@dilbarmobiles.pk</li>
                <li>Mon-Sat: 10AM - 10PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-6 text-center text-sm text-white/60">
            <p>&copy; 2024 Dilbar Mobiles. All rights reserved. • Best repair shop in Bahria Phase 7</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
