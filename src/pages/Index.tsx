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
import { SiteFooter } from "@/components/SiteFooter";
import { FeaturedSparePartsSection } from "@/components/FeaturedSparePartsSection";
import { PromoSection } from "@/components/PromoSection";
import { PartHelpRail } from "@/components/PartHelpRail";
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

      <SiteFooter />

      <PartHelpRail />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Index;
