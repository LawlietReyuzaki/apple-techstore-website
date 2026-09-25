import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Heart, Menu, Phone, Truck, User, Wrench } from "lucide-react";
import { SmartSearch } from "@/components/SmartSearch";
import { ProductCartButton } from "@/components/ProductCartButton";
import { AuthButton } from "@/components/AuthButton";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarContent } from "@/components/CatalogSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogMenu } from "@/hooks/useCatalogMenu";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";

type MenuId = "brand" | "part" | "price";
const LINKS_LEFT = [{ to: "/shop", label: "Shop All" }];
const LINKS_RIGHT = [
  { to: "/phones", label: "Used Phones" },
  { to: "/laptops", label: "Laptops" },
  { to: "/accessories", label: "Accessories" },
];
const MENUS: { id: MenuId; label: string; to: string; match: string }[] = [
  { id: "brand", label: "Shop by Brand", to: "/brands", match: "/brands" },
  { id: "part", label: "Shop by Part", to: "/parts", match: "/parts" },
  { id: "price", label: "Phones by Price", to: "/phones/price/10000-to-24999", match: "/phones/price" },
];

const navCls = (on: boolean) => cn(
  "inline-flex items-center gap-1 h-11 px-3 text-[13.5px] font-medium border-b-2 transition-colors whitespace-nowrap",
  on ? "border-primary text-primary" : "border-transparent text-foreground/85 hover:text-primary"
);

/** Store-wide header: utility bar, logo + smart search + account/cart, and a nav row with dropdown menus. */
export function StoreHeader({ initialQuery }: { initialQuery?: string }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data: menu } = useCatalogMenu();
  const [open, setOpen] = useState<MenuId | null>(null);
  useEffect(() => { setOpen(null); }, [pathname]);

  const partGroups = (() => {
    const m = new Map<string, NonNullable<typeof menu>["parts"]>();
    for (const p of menu?.parts ?? []) { const g = p.group || "Other"; if (!m.has(g)) m.set(g, []); m.get(g)!.push(p); }
    return [...m.entries()];
  })();

  return (
    <>
      {/* Utility bar */}
      <div className="bg-neutral-900 text-neutral-200 text-xs">
        <div className="container h-8 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 truncate">
            <Truck className="h-3.5 w-3.5 text-primary shrink-0" /> Free home delivery in Bahria Phase 7 on orders over Rs 4,999 · Cash on delivery nationwide
          </span>
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <a href="tel:+923342228141" className="flex items-center gap-1.5 hover:text-white"><Phone className="h-3.5 w-3.5" /> 0334-2228141</a>
            <Link to="/track-repair" className="hover:text-white">Track repair</Link>
            <Link to="/request-part" className="hover:text-white">Request a part</Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        {/* Main row */}
        <div className="container flex items-center gap-3 md:gap-5 h-16 md:h-[72px]">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden -ml-2" aria-label="Menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[360px] overflow-y-auto p-4">
              <SheetHeader className="mb-3"><SheetTitle>Menu</SheetTitle></SheetHeader>
              <nav className="grid grid-cols-2 gap-2 mb-4">
                {[...LINKS_LEFT, ...LINKS_RIGHT, { to: "/book-repair", label: "Book a Repair" }, { to: "/track-repair", label: "Track Repair" }].map((n) => (
                  <Link key={n.to} to={n.to} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", pathname === n.to ? "border-primary text-primary bg-primary/5" : "border-border hover:bg-muted")}>{n.label}</Link>
                ))}
              </nav>
              <SidebarContent active={pathname} plain />
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

          <div className="ml-auto flex items-center gap-0.5 md:gap-1 shrink-0">
            <div className="hidden md:block"><ThemeToggle /></div>
            <NotificationBell userId={user?.id} />
            <div className="hidden sm:block"><AuthButton /></div>
            {!user && <Link to="/login" aria-label="Sign in" className="sm:hidden"><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></Link>}
            <Link to="/wishlist" aria-label="Wishlist" className="hidden sm:block"><Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button></Link>
            <ProductCartButton />
          </div>
        </div>
        <div className="container pb-2.5 md:hidden"><SmartSearch initialQuery={initialQuery} /></div>

        {/* Category nav row with dropdown menus */}
        <nav className="hidden lg:block border-t border-border/70 relative" onMouseLeave={() => setOpen(null)}>
          <div className="container flex items-center">
            {LINKS_LEFT.map((n) => <Link key={n.to} to={n.to} className={navCls(pathname === n.to)}>{n.label}</Link>)}
            {MENUS.map((m) => (
              <button key={m.id} type="button"
                className={navCls(open === m.id || pathname.startsWith(m.match))}
                aria-haspopup="true" aria-expanded={open === m.id}
                onMouseEnter={() => setOpen(m.id)} onClick={() => setOpen((o) => (o === m.id ? null : m.id))}>
                {m.label} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === m.id && "rotate-180")} />
              </button>
            ))}
            {LINKS_RIGHT.map((n) => <Link key={n.to} to={n.to} className={navCls(pathname === n.to)}>{n.label}</Link>)}
            <Link to="/book-repair" className={cn("ml-auto inline-flex items-center gap-1.5 my-1.5 px-3.5 h-8 rounded-md text-[13.5px] font-semibold transition-colors",
              pathname.startsWith("/book-repair") ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground")}>
              <Wrench className="h-4 w-4" /> Book a Repair
            </Link>
          </div>

          {open && menu && (
            <div className="absolute left-0 right-0 top-full bg-popover text-popover-foreground border-b border-border shadow-xl z-50">
              <div className="container py-5">
                {open === "brand" && (
                  <>
                    <div className="grid grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-0.5">
                      {menu.brands.slice(0, 36).map((b) => (
                        <Link key={b.path} to={b.path} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted hover:text-primary">
                          <span>{b.name}</span><span className="text-xs text-muted-foreground">{b.count.toLocaleString()}</span>
                        </Link>
                      ))}
                    </div>
                    <Link to="/brands" className="inline-block mt-3 text-sm font-medium text-primary hover:underline">View all {menu.brands.length} brands →</Link>
                  </>
                )}
                {open === "part" && (
                  <>
                    <div className="grid grid-cols-3 xl:grid-cols-4 gap-6">
                      {partGroups.map(([g, parts]) => (
                        <div key={g}>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-2">{g}</div>
                          {parts.map((p) => (
                            <Link key={p.path} to={p.path} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted hover:text-primary">
                              <span>{p.name}</span><span className="text-xs text-muted-foreground">{p.count.toLocaleString()}</span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                    <Link to="/parts" className="inline-block mt-3 text-sm font-medium text-primary hover:underline">View all part types →</Link>
                  </>
                )}
                {open === "price" && (
                  <div className="grid grid-cols-4 gap-2 max-w-3xl">
                    {menu.phonePrices.map((p) => (
                      <Link key={p.path} to={p.path} className="rounded-lg border border-border px-3 py-2.5 text-sm hover:border-primary hover:text-primary">
                        <div className="font-medium">{p.name.replace(/^Mobile Phones /, "")}</div>
                        <div className="text-xs text-muted-foreground">{p.count.toLocaleString()} phones</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
