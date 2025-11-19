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
import { FlashSaleSection } from "@/components/FlashSaleSection";
import { DeviceCard } from "@/components/DeviceCard";
import { useAuth } from "@/hooks/useAuth";
import { storefrontApiRequest, GET_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/integrations/supabase/client";
import { devices, Device } from "@/data/devices";
import { toast } from "sonner";
import { Phone, ShoppingBag, Search, Menu, Wrench, Filter, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);
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
    fetchAllProducts();
    // Initialize with randomized devices
    setDisplayedDevices(shuffleArray(devices).slice(0, 6));
  }, []);

  // Apply filters to products in "Our Products" section
  useEffect(() => {
    let filtered = [...allProducts];

    // Apply brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        filters.brands.includes(product.brand)
      );
    }

    // Apply availability filter
    if (filters.availability === "available") {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (filters.availability === "coming-soon") {
      filtered = filtered.filter(product => product.stock <= 0);
    }

    // Apply price range filter
    filtered = filtered.filter(product => 
      product.price >= filters.priceRange[0] && 
      product.price <= filters.priceRange[1]
    );

    setDisplayedProducts(filtered);
  }, [filters, allProducts]);

  const fetchAllProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAllProducts(data || []);
      setDisplayedProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

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
      <div className="glass-effect text-foreground py-2 border-b">
        <div className="container flex flex-wrap items-center justify-between text-xs sm:text-sm gap-2">
          <span className="truncate">🎉 Welcome to Dilbar Mart - Wholesale Rates & Expert Repairs</span>
          <span className="hidden sm:block truncate">📞 Free Home Delivery in Bahria Phase 7</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b shadow-lg">
        <div className="container h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={logo} alt="Dilbar Mart" className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                Dilbar Mart
              </h1>
              <p className="text-[10px] sm:text-xs text-primary truncate">Wholesale & Repair Shop</p>
            </div>
          </Link>
          
          <div className="hidden lg:flex flex-1 max-w-2xl mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phones, brands, models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
            <Link to="/shop" className="hidden lg:block">
              <Button variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop
              </Button>
            </Link>
            <Link to="/book-repair" className="hidden lg:block">
              <Button variant="outline" size="sm">
                <Wrench className="h-4 w-4 mr-2" />
                Repairs
              </Button>
            </Link>
            <NotificationBell userId={user?.id} />
            <AuthButton />
            <CartDrawer />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Link to="/shop" className="block">
                    <Button className="w-full" variant="outline">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Shop
                    </Button>
                  </Link>
                  <Link to="/book-repair" className="block">
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
      <div className="container py-4 sm:py-6">
        <HeroCarousel />
      </div>

      {/* Promo Section with Repair & Parts Banners */}
      <PromoSection />

      {/* Trust Bar */}
      <TrustBar />

      {/* Brand Section */}
      <BrandSection />

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Featured Products from Local Inventory */}
      {localProducts.length > 0 && (
        <section className="py-8 sm:py-12">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Featured Deals</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Wholesale prices on premium phones</p>
              </div>
              <Link to="/shop">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {localProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Our Products Section - Products from Database */}
      <section className="py-8 sm:py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                Our Products
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                {displayedProducts.length} premium devices with competitive pricing
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-initial md:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[300px]">
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
              <Link to="/shop" className="flex-1 sm:flex-initial">
                <Button variant="outline" size="sm" className="w-full">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 sm:gap-6">
            {/* Desktop Filters */}
            <div className="hidden md:block">
              <ProductFilters filters={filters} onFilterChange={setFilters} />
            </div>

            {/* Products Grid */}
            <div className="md:col-span-3">
              {displayedProducts.length === 0 ? (
                <Card className="glass-card p-8 sm:p-12 text-center">
                  <Phone className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">No Products Found</h3>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                    Try adjusting your filters to see more products
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
                  {displayedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-8 sm:py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Our Services
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              More than just a phone shop
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <Card className="glass-card text-center p-4 sm:p-6 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border-primary/30 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Wholesale Phones</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                New, used, and refurbished phones from all major brands at unbeatable wholesale prices.
              </p>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">Shop Now</Button>
            </Card>

            <Link to="/book-repair" className="group">
              <Card className="glass-card text-center p-4 sm:p-6 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border-primary/30 h-full flex flex-col items-center justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Expert Repairs</h3>
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  Professional repairs, quick turnaround, and warranty included on all services.
                </p>
                <Button variant="outline" size="sm" className="w-full sm:w-auto border-primary/50 hover:bg-primary hover:text-white">Book Repair</Button>
              </Card>
            </Link>

            <Card className="glass-card text-center p-4 sm:p-6 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border-primary/30 group sm:col-span-2 md:col-span-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Sell Your Phone</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Get instant cash for your old phone. Fair prices and quick transactions guaranteed.
              </p>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">Get Quote</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      {/* Payment Methods */}
      <PaymentMethodsStrip />

      {/* Footer */}
      <footer className="glass-effect border-t py-8 sm:py-12">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-foreground">Dilbar Mart</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Your trusted partner for wholesale phones and professional repairs in Bahria Phase 7.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-foreground">Shop</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">New Phones</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Used Phones</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Accessories</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Parts</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-foreground">Services</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Phone Repair</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Screen Replacement</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Battery Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Sell Your Phone</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-foreground">Contact</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>Bahria Phase 7, Rawalpindi</li>
                <li>Phone: +92 XXX XXXXXXX</li>
                <li>Email: info@dilbarmart.pk</li>
                <li>Mon-Sat: 10AM - 10PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-4 sm:pt-6 text-center text-xs sm:text-sm text-muted-foreground">
            <p>&copy; 2024 Dilbar Mart. All rights reserved. • Best repair shop in Bahria Phase 7</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
