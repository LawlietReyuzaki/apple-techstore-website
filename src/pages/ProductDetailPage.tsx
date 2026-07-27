import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, Package, Wrench, ChevronRight } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductReviews } from "@/components/ProductReviews";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { useAuth } from "@/hooks/useAuth";
import { ProductSEO } from "@/components/ProductSEO";
import { getImageUrl } from "@/lib/imageUrl";

// ── Small inline trust icons (line-drawn, no emoji) ──────────────────────────
const IconShield = (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>);
const IconTruck = (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>);
const IconCash = (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>);
const IconCheck = (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M8.5 12l2.3 2.3 4.7-4.7"/></svg>);
const IconBolt = (p: any) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>);

const TRUST = [
  { Icon: IconShield, title: "7-Day Warranty", sub: "Checked on arrival" },
  { Icon: IconTruck, title: "Fast Delivery", sub: "1–3 days nationwide" },
  { Icon: IconCash, title: "Cash on Delivery", sub: "Pay when it arrives" },
  { Icon: IconCheck, title: "100% Original", sub: "Sealed & verified" },
];

const FAQS = [
  { q: "Is Cash on Delivery available?", a: "Yes — you can pay in cash when your order arrives, anywhere in Pakistan. You only pay once the parcel is in your hands." },
  { q: "How long does delivery take?", a: "Orders are dispatched the same or next working day and typically arrive within 1–3 days nationwide. Delivery inside Bahria Phase 7 is free." },
  { q: "Are the products original?", a: "Every item is 100% original and inspected before dispatch. Phones arrive water-packed sealed to minimise any risk of faults in transit." },
  { q: "What if there's an issue after delivery?", a: "All items come with a 7-day checking warranty. If something isn't right, contact us and we'll sort out a replacement or resolution quickly." },
];

// Formats plain-text description into readable JSX with headings and bullets
function FormattedDescription({ text }: { text: string }) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-[14.7px] leading-relaxed text-muted-foreground">
      {lines.map((line, i) => {
        if (line.endsWith(':') && line.length < 60) {
          return <h4 key={i} className="text-base font-semibold text-foreground mt-4">{line}</h4>;
        }
        if (/^[-*•]/.test(line) || /^\d+\./.test(line)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">•</span>
              <span>{line.replace(/^[-*•\d.]+\s*/, '')}</span>
            </div>
          );
        }
        if (line.includes(':') && line.indexOf(':') < 40) {
          const colonIdx = line.indexOf(':');
          return (
            <div key={i} className="flex gap-2">
              <span className="font-medium text-foreground shrink-0">{line.slice(0, colonIdx).trim()}:</span>
              <span>{line.slice(colonIdx + 1).trim()}</span>
            </div>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-3.5 mb-4 border-b">
      <span className="w-1 h-5 rounded bg-blue-600 dark:bg-blue-400" />
      <h2 className="text-lg font-extrabold tracking-tight">{children}</h2>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addItem = useProductCartStore(state => state.addItem);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = UUID_RE.test(id || '');

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*").eq(isUUID ? "id" : "slug", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: productColors } = useQuery({
    queryKey: ["product-colors", id, product?.has_color_options],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_colors").select("*").eq("product_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id && product?.has_color_options === true,
  });

  const { data: productPartTypes } = useQuery({
    queryKey: ["product-part-types", id, product?.has_part_type_options],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_part_types").select("*").eq("product_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id && product?.has_part_type_options === true,
  });

  const handleAddToCart = (): boolean => {
    if (!product) return false;
    if (product.stock <= 0) { toast.error("This item is out of stock"); return false; }
    if (product.has_color_options && productColors && productColors.length > 0 && !selectedColor) {
      toast.error("Please select a color"); return false;
    }
    if (product.has_part_type_options && productPartTypes && productPartTypes.length > 0 && !selectedPartType) {
      toast.error("Please select a part type"); return false;
    }
    const adjustedQuantity = Math.min(quantity, product.stock);
    if (adjustedQuantity < quantity) toast.info(`Quantity adjusted to ${adjustedQuantity} (max available)`);
    const selectedColorData = selectedColor ? productColors?.find(c => c.id === selectedColor) : null;
    const selectedPartTypeData = selectedPartType ? productPartTypes?.find(pt => pt.id === selectedPartType) : null;
    addItem(
      { id: product.id, name: product.name, brand: product.brand, price: product.price, wholesale_price: product.wholesale_price, images: product.images, type: 'product' },
      adjustedQuantity,
      selectedColorData?.color_name || null,
      selectedColorData?.color_code || null,
      selectedPartTypeData?.part_type_name || null
    );
    toast.success("Added to cart", { description: `${adjustedQuantity}x ${product.name}` });
    return true;
  };

  const handleBuyNow = () => { if (handleAddToCart()) navigate("/checkout"); };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" /><Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-40" /><Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Button asChild><Link to="/shop">Back to Shop</Link></Button>
        </div>
      </div>
    );
  }

  const hasWholesale = product.wholesale_price && product.wholesale_price < product.price;
  const displayPrice = hasWholesale ? product.wholesale_price : product.price;
  const saveAmount = hasWholesale ? product.price - product.wholesale_price! : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-0">
      <ProductSEO
        name={product.name} description={product.description} price={product.price}
        salePrice={product.wholesale_price} brand={product.brand} image={product.images?.[0]}
        stock={product.stock || 0} url={`/product/${(product as any).slug || product.id}`}
        category="Mobile Spare Parts"
      />

      {/* Announcement bar */}
      <div className="bg-foreground text-background text-xs">
        <div className="container mx-auto px-4 h-9 flex items-center justify-center gap-5 flex-wrap font-medium">
          <span className="inline-flex items-center gap-1.5"><IconTruck className="w-3.5 h-3.5" /> Free delivery in Bahria Phase 7</span>
          <span className="hidden sm:inline-flex items-center gap-1.5"><IconCash className="w-3.5 h-3.5" /> Cash on Delivery nationwide</span>
          <span className="hidden md:inline-flex items-center gap-1.5"><IconCheck className="w-3.5 h-3.5" /> 100% original stock</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight">
            <span className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-800 text-white grid place-items-center">A</span>
            AppleTechStore
          </Link>
          <WishlistButton productId={product.id} userId={user?.id} />
        </div>
      </header>

      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[13px] text-muted-foreground py-4 flex-wrap">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <Link to="/shop" className="hover:text-blue-600 dark:hover:text-blue-400">Shop</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-foreground/80 line-clamp-1">{product.name}</span>
        </nav>

        {/* ── Top: gallery + summary ── */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start pt-2">
          {/* Gallery */}
          <div className="md:sticky md:top-24">
            <div className="relative aspect-square bg-card border rounded-2xl overflow-hidden grid place-items-center shadow-sm">
              {product.images && product.images.length > 0 ? (
                <img
                  src={getImageUrl(product.images[selectedImage])}
                  alt={product.name}
                  className="w-full h-full object-contain p-[9%]"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground" />
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2.5 mt-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-xl overflow-hidden border-[1.5px] bg-card transition-all ${selectedImage === idx ? 'border-blue-600 ring-2 ring-blue-500/25' : 'border-border hover:-translate-y-0.5 hover:border-blue-400'}`}
                  >
                    <img src={getImageUrl(img)} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-contain p-[12%]"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-2 font-bold text-[13px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-lg">
                    {product.brand}
                  </span>
                  {product.featured && (
                    <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg">Featured</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/70 tabular-nums">SKU: {product.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mt-3">{product.name}</h1>
            </div>

            <div className="h-px bg-border" />

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                  <span className="text-xl font-bold text-muted-foreground mr-1">Rs.</span>{displayPrice?.toLocaleString()}
                </span>
                {hasWholesale && (
                  <span className="text-lg text-muted-foreground/70 line-through tabular-nums">Rs. {product.price.toLocaleString()}</span>
                )}
                {saveAmount > 0 && (
                  <span className="text-[12.5px] font-extrabold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-full tabular-nums">
                    Save Rs. {saveAmount.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 text-[13.5px] font-semibold">
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-2 text-green-700 dark:text-green-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600 ring-4 ring-green-500/20" />
                    In stock — {product.stock} available
                  </span>
                ) : (
                  <span className="text-destructive">Out of stock</span>
                )}
              </div>
            </div>

            {/* Color options */}
            {product.has_color_options && productColors && productColors.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <b className="text-sm font-bold">Select Color</b>
                  <span className="text-[11.5px] uppercase tracking-wide font-semibold text-muted-foreground/70">Required</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {productColors.map((color) => (
                    <button key={color.id} onClick={() => setSelectedColor(color.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-[1.5px] text-sm font-bold transition-all ${selectedColor === color.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'border-border bg-card hover:border-blue-400'}`}>
                      {color.color_code && <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: color.color_code }} />}
                      {color.color_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Part type options */}
            {product.has_part_type_options && productPartTypes && productPartTypes.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <b className="text-sm font-bold">Select Part Type</b>
                  <span className="text-[11.5px] uppercase tracking-wide font-semibold text-muted-foreground/70">Required</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {productPartTypes.map((pt) => (
                    <button key={pt.id} onClick={() => setSelectedPartType(pt.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-[1.5px] text-sm font-bold transition-all ${selectedPartType === pt.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'border-border bg-card hover:border-blue-400'}`}>
                      <Wrench className="h-3.5 w-3.5" />{pt.part_type_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + actions */}
            <div className="flex gap-3 items-stretch flex-wrap">
              <div className="flex items-center border-[1.5px] rounded-xl overflow-hidden bg-card">
                <button className="w-11 h-[54px] text-xl hover:bg-muted" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span className="w-11 text-center font-extrabold tabular-nums">{quantity}</span>
                <button className="w-11 h-[54px] text-xl hover:bg-muted disabled:opacity-40" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={quantity >= product.stock}>+</button>
              </div>
              <button onClick={handleAddToCart} disabled={product.stock <= 0}
                className="h-[54px] px-5 rounded-xl border-[1.5px] bg-card font-extrabold inline-flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50">
                <ShoppingCart className="w-[18px] h-[18px]" /> Add to cart
              </button>
              <button onClick={handleBuyNow} disabled={product.stock <= 0}
                className="h-[54px] flex-1 min-w-[170px] px-6 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <IconBolt className="w-[18px] h-[18px]" /> Buy now — COD
              </button>
            </div>

            {/* Trust bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border rounded-2xl overflow-hidden bg-card">
              {TRUST.map(({ Icon, title, sub }, i) => (
                <div key={i} className="flex flex-col gap-1.5 p-3.5 border-r last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r border-border/60">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <b className="text-[12.5px] font-bold leading-tight">{title}</b>
                  <span className="text-[11px] text-muted-foreground/80">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content: overview + FAQ (main) / recommendations (aside) ── */}
        <div className="grid md:grid-cols-3 gap-8 mt-9">
          <div className="md:col-span-2 space-y-5">
            {product.description && (
              <div className="bg-card border rounded-2xl p-6 lg:p-7 shadow-sm">
                <SectionHeading>Overview</SectionHeading>
                <FormattedDescription text={product.description} />
              </div>
            )}

            <div className="bg-card border rounded-2xl p-6 lg:p-7 shadow-sm">
              <SectionHeading>Frequently asked questions</SectionHeading>
              <div>
                {FAQS.map((f, i) => (
                  <details key={i} className="border-b last:border-b-0 group" open={i === 0}>
                    <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer font-bold text-[14.5px] list-none [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <ChevronRight className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="pb-4 text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          <aside>
            <div className="md:sticky md:top-24">
              <RecommendationsCard currentProductId={product.id} categoryId={product.category_id} />
            </div>
          </aside>
        </div>

        {/* Reviews (full width) */}
        <div className="mt-9">
          <ProductReviews productId={product.id} userId={user?.id} />
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      <div className="fixed md:hidden left-0 right-0 bottom-0 z-50 bg-card/95 backdrop-blur-md border-t px-4 py-2.5 flex items-center gap-3">
        <div className="font-extrabold text-lg tabular-nums">
          <span className="text-[11px] text-muted-foreground font-semibold">Rs.</span> {displayPrice?.toLocaleString()}
        </div>
        <button onClick={handleAddToCart} disabled={product.stock <= 0}
          className="h-11 px-4 rounded-xl border-[1.5px] bg-card font-bold text-sm disabled:opacity-50">Cart</button>
        <button onClick={handleBuyNow} disabled={product.stock <= 0}
          className="h-11 flex-1 rounded-xl bg-blue-700 text-white font-extrabold text-sm disabled:opacity-50">Buy now</button>
      </div>
    </div>
  );
}
