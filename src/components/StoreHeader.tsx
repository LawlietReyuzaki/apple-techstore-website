import { Link, useLocation } from "react-router-dom";
import { Heart, Menu, Phone, Truck, User, Wrench } from "lucide-react";
import { SmartSearch } from "@/components/SmartSearch";
import { ProductCartButton } from "@/components/ProductCartButton";
import { AuthButton } from "@/components/AuthButton";
import { NotificationBell } from "@/components/NotificationBell";
import { SidebarContent } from "@/components/CatalogSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";

const NAV = [
  { to: "/shop", label: "Shop All" },
  { to: "/brands", label: "Shop by Brand" },
  { to: "/parts", label: "Shop by Part" },
  { to: "/phones/price/10000-to-24999", label: "Phones by Price", match: "/phones/price" },
  { to: "/phones", label: "Used Phones", exact: true },
  { to: "/laptops", label: "Laptops" },
  { to: "/accessories", label: "Accessories" },
];

function isActive(pathname: string, n: { to: string; match?: string; exact?: boolean }) {
  if (n.exact) return pathname === n.to;
  return pathname.startsWith(n.match ?? n.to);
}

/** Store-wide header: utility bar, logo + smart search + account/cart, and the category nav row. */
export function StoreHeader({ initialQuery }: { initialQuery?: string }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Utility bar */}
      <div className="bg-neutral-950 text-neutral-200 text-xs">
        <div className="container h-8 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 truncate">
            <Truck className="h-3.5 w-3.5 text-primary shrink-0" /> Free home delivery in Bahria Phase 7 on orders over Rs 4,999
          </span>
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <a href="tel:+923342228141" className="flex items-center gap-1.5 hover:text-white"><Phone className="h-3.5 w-3.5" /> 0334-2228141</a>
            <Link to="/track-repair" className="hover:text-white">Track repair</Link>
            <Link to="/request-part" className="hover:text-white">Request a part</Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/60 shadow-sm">
        {/* Main row */}
        <div className="container flex items-center gap-3 md:gap-5 h-16 md:h-[72px]">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden -ml-2" aria-label="Menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[360px] overflow-y-auto">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <nav className="mt-4 grid grid-cols-2 gap-2">
                {[...NAV, { to: "/book-repair", label: "Book Repair" }].map((n) => (
                  <Link key={n.to} to={n.to} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", isActive(pathname, n) ? "border-primary text-primary bg-primary/5" : "border-border hover:bg-muted")}>{n.label}</Link>
                ))}
              </nav>
              <div className="mt-6"><SidebarContent active={pathname} /></div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logo} alt="AppleTechStore" className="h-10 w-10 md:h-11 md:w-11 rounded-xl" />
            <span className="hidden sm:block leading-tight">
              <span className="block font-extrabold text-lg tracking-tight text-foreground">AppleTechStore</span>
              <span className="block text-[11px] text-muted-foreground">Phones · Parts · Repairs</span>
            </span>
          </Link>

          <div className="hidden md:block flex-1 max-w-3xl mx-auto"><SmartSearch size="lg" initialQuery={initialQuery} /></div>

          <div className="ml-auto flex items-center gap-0.5 md:gap-1.5 shrink-0">
            <NotificationBell userId={user?.id} />
            <div className="hidden sm:block"><AuthButton /></div>
            {!user && <Link to="/login" aria-label="Sign in" className="sm:hidden"><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></Link>}
            <Link to="/wishlist" aria-label="Wishlist" className="hidden sm:block"><Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button></Link>
            <ProductCartButton />
          </div>
        </div>
        <div className="container pb-2.5 md:hidden"><SmartSearch initialQuery={initialQuery} /></div>

        {/* Category nav row */}
        <nav className="hidden lg:block border-t border-border/50">
          <div className="container flex items-center gap-1 h-10">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  isActive(pathname, n) ? "text-primary bg-primary/10" : "text-foreground/80 hover:text-foreground hover:bg-muted")}>
                {n.label}
              </Link>
            ))}
            <Link to="/book-repair" className={cn("ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors",
              pathname.startsWith("/book-repair") ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/10")}>
              <Wrench className="h-4 w-4" /> Book a Repair
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
