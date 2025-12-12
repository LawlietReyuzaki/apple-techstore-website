import { useState, useEffect, useCallback } from "react";
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
import { FeaturedSparePartsSection } from "@/components/FeaturedSparePartsSection";
import { PromoSection } from "@/components/PromoSection";
import { WholesaleBanner } from "@/components/WholesaleBanner";
import { FeaturesStrip } from "@/components/FeaturesStrip";
import { FlashSaleSection } from "@/components/FlashSaleSection";
import { DeviceCard } from "@/components/DeviceCard";
import { DynamicCategoriesSection } from "@/components/DynamicCategoriesSection";
import { ShopCategoryShowcase } from "@/components/ShopCategoryShowcase";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";
import { storefrontApiRequest, GET_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/integrations/supabase/client";
import { devices, Device } from "@/data/devices";
import { toast } from "sonner";
import { Phone, ShoppingBag, Search, Menu, Wrench, Filter, ArrowRight, Sparkles, Zap, Smartphone, Laptop, Headphones } from "lucide-react";
import logo from "@/assets/logo.jpg";

// Session storage key for loading screen
const LOADING_SHOWN_KEY = "appletechstore_loading_shown";

import { useInView } from 'react-intersection-observer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

// Section Components with Scroll Animations

const LimitedTimeOffersSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  
  return (
    <section 
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container relative z-10">
        <div className={`text-center mb-12 transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm mb-6 animate-pulse-slow border border-primary/30">
            <Zap className="h-5 w-5 text-primary animate-glow" />
            <span className="text-white font-semibold">Limited Time Offers!</span>
            <Sparkles className="h-5 w-5 text-accent animate-glow" />
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold mb-4 text-white animate-shimmer bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent bg-[length:200%_100%]">
            Flash Sale
          </h2>
          <p className="text-white/80 text-xl max-w-2xl mx-auto">
            Don't miss out on unbeatable deals - limited stock available!
          </p>
        </div>

        <div className={`transition-all duration-1000 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <FlashSaleSection />
        </div>
      </div>
    </section>
  );
};

const SparePartsSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  
  return (
    <section 
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-white via-purple-50 to-blue-50"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container relative z-10">
        <div className={`text-center mb-12 transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 mb-6 border border-primary/20">
            <Wrench className="h-5 w-5 text-primary" />
            <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Spare Parts & Repair Parts
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Quality Parts
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Genuine replacement parts for all major brands
          </p>
        </div>

        <div className={`transition-all duration-1000 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <FeaturedSparePartsSection />
        </div>
      </div>
    </section>
  );
};

const FeaturedDealsSection = ({ localProducts }: { localProducts: any[] }) => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  
  if (localProducts.length === 0) return null;

  return (
    <section 
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative z-10">
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4 transition-all duration-1000 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm mb-4 border border-primary/30">
              <Sparkles className="h-5 w-5 text-white" />
              <span className="text-white font-semibold">Featured Deals</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold mb-4 text-white">
              Premium Picks
            </h2>
            <p className="text-white/80 text-xl">
              Wholesale prices on flagship smartphones
            </p>
          </div>
          <Link to="/shop">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-glow"
            >
              View All <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-all duration-1000 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          {localProducts.map((product, index) => (
            <div 
              key={product.id}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const OurProductsSection = ({ 
  displayedProducts, 
  filters, 
  setFilters 
}: { 
  displayedProducts: any[]; 
  filters: any; 
  setFilters: (filters: any) => void;
}) => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  
  return (
    <section 
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container relative z-10">
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4 transition-all duration-1000 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 mb-4 border border-primary/20">
              <Phone className="h-5 w-5 text-primary" />
              <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Our Products
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Full Catalog
            </h2>
            <p className="text-muted-foreground text-xl">
              {displayedProducts.length} premium devices with competitive pricing
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="flex-1 sm:flex-initial md:hidden glass-effect border-primary/20">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[300px] glass-effect">
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
              <Button size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg">
                View All <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <div className={`grid md:grid-cols-4 gap-6 transition-all duration-1000 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          {/* Desktop Filters */}
          <div className="hidden md:block">
            <div className="glass-effect p-6 rounded-2xl border border-primary/20 sticky top-24">
              <ProductFilters filters={filters} onFilterChange={setFilters} />
            </div>
          </div>

          {/* Products Grid */}
          <div className="md:col-span-3">
            {displayedProducts.length === 0 ? (
              <Card className="glass-card p-12 text-center border-primary/20">
                <Phone className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse-slow" />
                <h3 className="text-2xl font-bold mb-2">No Products Found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters to see more products
                </p>
                <Button 
                  onClick={() => setFilters({
                    brands: [],
                    availability: "all",
                    priceRange: [0, 500000]
                  })}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                >
                  Reset Filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProducts.map((product, index) => (
                  <div 
                    key={product.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const OurServicesSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  
  return (
    <section 
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container relative z-10">
        <div className={`text-center mb-12 transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm mb-6 border border-primary/30">
            <ShoppingBag className="h-5 w-5 text-white" />
            <span className="text-white font-semibold">Our Services</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold mb-4 text-white animate-shimmer bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent bg-[length:200%_100%]">
            More Than Phones
          </h2>
          <p className="text-white/80 text-xl max-w-2xl mx-auto">
            Complete solutions for all your mobile needs
          </p>
        </div>
        
        <div className={`grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto transition-all duration-1000 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <Card className="glass-effect text-center p-8 hover:scale-105 transition-all duration-300 border-primary/30 group bg-white/5 backdrop-blur-xl animate-slide-in-left">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 animate-glow">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-black">Wholesale Phones</h3>
            <p className="text-black/80 mb-6 leading-relaxed">
              New, used, and refurbished phones from all major brands at unbeatable wholesale prices.
            </p>
            <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 w-full">
              Shop Now
            </Button>
          </Card>

          <Link to="/book-repair" className="group">
            <Card className="glass-effect text-center p-8 hover:scale-105 transition-all duration-300 border-primary/30 h-full flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 animate-glow">
                <Wrench className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-black">Expert Repairs</h3>
              <p className="text-black/80 mb-6 leading-relaxed">
                Professional repairs, quick turnaround, and warranty included on all services.
              </p>
              <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 w-full">
                Book Repair
              </Button>
            </Card>
          </Link>

          <Card className="glass-effect text-center p-8 hover:scale-105 transition-all duration-300 border-primary/30 group bg-white/5 backdrop-blur-xl sm:col-span-2 md:col-span-1 animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 animate-glow">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-black">Sell Your Phone</h3>
            <p className="text-black/80 mb-6 leading-relaxed">
              Get instant cash for your old phone. Fair prices and quick transactions guaranteed.
            </p>
            <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 w-full">
              Get Quote
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};

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

  // Loading screen state - show only once per session
  const [showLoading, setShowLoading] = useState(() => {
    return !sessionStorage.getItem(LOADING_SHOWN_KEY);
  });

  const handleLoadingComplete = useCallback(() => {
    sessionStorage.setItem(LOADING_SHOWN_KEY, "true");
    setShowLoading(false);
  }, []);

  return (
    <>
      {/* Loading Screen - shows only once per session */}
      {showLoading && <LoadingScreen onLoadingComplete={handleLoadingComplete} />}
      
      <div className="min-h-screen bg-background">
        {/* Top Bar */}
        <div className="bg-black text-white py-2 border-b border-gray-800">
          <div className="container flex flex-wrap items-center justify-between text-xs sm:text-sm gap-2">
            <span className="truncate">🎉 Welcome to AppleTechStore - Wholesale Rates & Expert Repairs</span>
            <span className="hidden sm:block truncate">📞 Free Home Delivery in Bahria Phase 7</span>
          </div>
        </div>

      {/* Header */}
       <header className="sticky top-0 z-50 glass-effect border-b shadow-lg">
         <div className="container h-18 sm:h-24 flex items-center justify-between gap-2 sm:gap-4">
           <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
             <img src={logo} alt="AppleTechStore" className="h-14 w-14 sm:h-20 sm:w-20 flex-shrink-0 rounded-xl" />
             <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                AppleTechStore
              </h1>
              <p className="text-[10px] sm:text-xs text-primary truncate">Your Destination for Innovation</p>
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
            <Link to="/shop" className="hidden lg:block">
              <Button variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop
              </Button>
            </Link>
            <Link to="/phones" className="hidden xl:block">
              <Button variant="ghost" size="sm">
                <Smartphone className="h-4 w-4 mr-2" />
                Used Phones
              </Button>
            </Link>
            <Link to="/laptops" className="hidden xl:block">
              <Button variant="ghost" size="sm">
                <Laptop className="h-4 w-4 mr-2" />
                Laptops
              </Button>
            </Link>
            <Link to="/accessories" className="hidden xl:block">
              <Button variant="ghost" size="sm">
                <Headphones className="h-4 w-4 mr-2" />
                Accessories
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
                  <Link to="/phones" className="block">
                    <Button className="w-full" variant="outline">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Used Phones
                    </Button>
                  </Link>
                  <Link to="/laptops" className="block">
                    <Button className="w-full" variant="outline">
                      <Laptop className="h-4 w-4 mr-2" />
                      Laptops
                    </Button>
                  </Link>
                  <Link to="/accessories" className="block">
                    <Button className="w-full" variant="outline">
                      <Headphones className="h-4 w-4 mr-2" />
                      Accessories
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

      {/* DYNAMIC CATEGORIES SECTION - Shop by Category */}
      <DynamicCategoriesSection />

      {/* LIMITED TIME OFFERS - Dark Background */}
      <LimitedTimeOffersSection />

      {/* SPARE PARTS & REPAIR PARTS - Bright Background */}
      <SparePartsSection />

      {/* FEATURED DEALS - Dark Background */}
      <FeaturedDealsSection localProducts={localProducts} />

      {/* OUR PRODUCTS - Bright Background */}
      <OurProductsSection 
        displayedProducts={displayedProducts}
        filters={filters}
        setFilters={setFilters}
      />

      {/* SHOP CATEGORY SHOWCASE - Alternating Dark/Light Sections */}
      <ShopCategoryShowcase />

      {/* OUR SERVICES - Dark Background */}
      <OurServicesSection />

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
            <p>&copy; 2024 AppleTechStore. All rights reserved. • Best repair shop in Bahria Phase 7</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <WhatsAppFloatingButton />
    </div>
    </>
  );
};

export default Index;
