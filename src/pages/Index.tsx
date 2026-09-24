import { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StoreHeader } from "@/components/StoreHeader";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TrustBar } from "@/components/TrustBar";
import { BrandSection } from "@/components/BrandSection";
import { ContactSection } from "@/components/ContactSection";
import { ProductCard } from "@/components/ProductCard";
import { PaymentMethodsStrip } from "@/components/PaymentMethodsStrip";
import { FeaturedSparePartsSection } from "@/components/FeaturedSparePartsSection";
import { PromoSection } from "@/components/PromoSection";
import { WholesaleBanner } from "@/components/WholesaleBanner";
import { FlashSaleSection } from "@/components/FlashSaleSection";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { CategoryRow } from "@/components/CategoryRow";
import { CatalogSidebar, MobileSidebar } from "@/components/CatalogSidebar";
import { SectionHeader } from "@/components/SectionHeader";
import { TrustIndicators } from "@/components/TrustIndicators";
import { supabase } from "@/integrations/supabase/client";
import { Phone, ShoppingBag, Wrench, Sparkles } from "lucide-react";

const PRODUCT_COLS = "id,name,brand,price,sale_price,wholesale_price,stock,images,featured,on_sale";

// ── Compact homepage sections ─────────────────────────────────────────────

const FeaturedDeals = memo(({ products }: { products: any[] }) => {
  if (products.length === 0) return null;
  return (
    <section className="rounded-2xl bg-gradient-to-br from-neutral-900 to-black p-4 md:p-5">
      <SectionHeader light icon={Sparkles} title="Featured Deals" subtitle="Wholesale prices on flagship phones" to="/shop" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
});

const LatestProducts = memo(({ products }: { products: any[] }) => (
  <section>
    <SectionHeader icon={Phone} title="Latest Products" subtitle="Recently added to the store" to="/shop" cta="Full catalog" />
    {products.length === 0 ? (
      <p className="text-sm text-muted-foreground">Loading products…</p>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    )}
  </section>
));

const SERVICES = [
  { icon: Phone, title: "Wholesale Phones", text: "New, used and refurbished phones from all major brands at wholesale prices.", to: "/phones", cta: "Shop phones" },
  { icon: Wrench, title: "Expert Repairs", text: "Professional repairs with quick turnaround and a 90-day warranty.", to: "/book-repair", cta: "Book a repair" },
  { icon: ShoppingBag, title: "Request a Part", text: "Can't find what you need? We source parts and accessories for any model.", to: "/request-part", cta: "Request a part" },
];

const ServicesSection = () => (
  <section>
    <SectionHeader icon={Wrench} title="Our Services" subtitle="More than phones" />
    <div className="grid sm:grid-cols-3 gap-3 md:gap-4">
      {SERVICES.map((s) => (
        <Card key={s.title} className="p-5 flex flex-col gap-3 border-border/60">
          <span className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-primary" /></span>
          <h3 className="font-semibold text-foreground">{s.title}</h3>
          <p className="text-sm text-muted-foreground flex-1">{s.text}</p>
          <Link to={s.to}><Button size="sm" variant="outline" className="w-full">{s.cta}</Button></Link>
        </Card>
      ))}
    </div>
  </section>
);

const Index = () => {
  const [featured, setFeatured] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("products").select(PRODUCT_COLS).order("created_at", { ascending: false }).limit(8)
      .then(({ data, error }: any) => { if (!error) setLatest(data || []); });
    supabase.from("products").select(PRODUCT_COLS).eq("featured", true).limit(4)
      .then(({ data, error }: any) => { if (!error) setFeatured(data || []); });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      {/* Small, scrollable category icons */}
      <CategoryRow />

      {/* Left pane + main content */}
      <div className="container flex gap-6 items-start pb-10">
        <CatalogSidebar />
        <div className="flex-1 min-w-0 space-y-8 md:space-y-10">
          <div className="flex items-center justify-between lg:hidden -mb-4">
            <span className="text-sm text-muted-foreground">Browse by brand, part or price</span>
            <MobileSidebar label="Browse" />
          </div>

          {/* Hero: carousel + stacked promo tiles */}
          <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
            <div className="lg:col-span-2 min-w-0"><HeroCarousel /></div>
            <PromoSection stacked />
          </div>

          <FlashSaleSection />
          <FeaturedSparePartsSection />
          <WholesaleBanner />
          <FeaturedDeals products={featured} />
          <LatestProducts products={latest} />
          <ServicesSection />
        </div>
      </div>

      {/* Trust / brands / contact — bottom of the page */}
      <TrustIndicators />
      <TrustBar />
      <BrandSection />
      <ContactSection />
      <PaymentMethodsStrip />

      {/* Footer */}
      <footer className="border-t bg-card py-8 sm:py-12">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-foreground">AppleTechStore</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Your trusted partner for wholesale phones, genuine spare parts and professional repairs in Bahria Phase 7.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-foreground">Shop</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><Link to="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
                <li><Link to="/brands" className="hover:text-primary transition-colors">Shop by Brand</Link></li>
                <li><Link to="/parts" className="hover:text-primary transition-colors">Shop by Part</Link></li>
                <li><Link to="/phones" className="hover:text-primary transition-colors">Used Phones</Link></li>
                <li><Link to="/accessories" className="hover:text-primary transition-colors">Accessories</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-foreground">Services</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><Link to="/book-repair" className="hover:text-primary transition-colors">Phone Repair</Link></li>
                <li><Link to="/parts/lcd-panels" className="hover:text-primary transition-colors">Screen Replacement</Link></li>
                <li><Link to="/parts/batteries" className="hover:text-primary transition-colors">Battery Service</Link></li>
                <li><Link to="/request-part" className="hover:text-primary transition-colors">Request a Part</Link></li>
                <li><Link to="/track-repair" className="hover:text-primary transition-colors">Track Repair</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-foreground">Contact</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>Bahria Phase 7, Rawalpindi</li>
                <li>Phone: +92 334 2228141</li>
                <li>WhatsApp: +92 320 0450584</li>
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

      <WhatsAppFloatingButton />
    </div>
  );
};

export default Index;
