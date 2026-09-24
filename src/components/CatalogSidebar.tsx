import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Plus, SlidersHorizontal, Smartphone, Tag, Wrench, X } from "lucide-react";
import { useCatalogMenu, MenuEntry } from "@/hooks/useCatalogMenu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface FacetOption { slug: string; name: string; count: number }
export type FilterKey = "part" | "brand" | "price" | "stock";
export interface SidebarFilters {
  facets: { parts: FacetOption[]; brands: FacetOption[]; prices: FacetOption[] };
  selected: Record<FilterKey, string>;
  onChange: (key: FilterKey, value: string) => void;
  onClear: () => void;
}

const BRANDS_SHOWN = 12;
const PARTS_SHOWN = 10;

function NavRow({ e, active }: { e: MenuEntry; active?: string }) {
  const isActive = active === e.path || (active?.startsWith(e.path + "/") ?? false);
  return (
    <Link to={e.path}
      className={cn("flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")}>
      <span className="truncate">{e.name}</span>
      <span className="text-xs text-muted-foreground ml-2 shrink-0">{e.count.toLocaleString()}</span>
    </Link>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Tag; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FacetList({ title, options, value, onPick }: { title: string; options: FacetOption[]; value: string; onPick: (v: string) => void }) {
  const [more, setMore] = useState(false);
  if (!options.length && !value) return null;
  const shown = more ? options : options.slice(0, 8);
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground px-2 mb-1">{title}</div>
      <div className="space-y-0.5">
        {shown.map((o) => {
          const on = value === o.slug;
          return (
            <button key={o.slug} type="button" onClick={() => onPick(on ? "" : o.slug)}
              className={cn("w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors",
                on ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground")}>
              <span className={cn("h-4 w-4 rounded border flex items-center justify-center shrink-0",
                on ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                {on && <Check className="h-3 w-3" />}
              </span>
              <span className="flex-1 truncate">{o.name}</span>
              <span className="text-xs text-muted-foreground">{o.count.toLocaleString()}</span>
            </button>
          );
        })}
        {options.length > 8 && (
          <button type="button" onClick={() => setMore((m) => !m)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:underline">
            <ChevronDown className={cn("h-3 w-3 transition-transform", more && "rotate-180")} />
            {more ? "Show less" : `Show all ${options.length}`}
          </button>
        )}
      </div>
    </div>
  );
}

/** The pane's content: optional filters for the current page, then Shop by Brand / Part / Price. */
export function SidebarContent({ active, filters }: { active?: string; filters?: SidebarFilters }) {
  const { data, isLoading } = useCatalogMenu();
  const hasFilter = filters && Object.values(filters.selected).some(Boolean);

  return (
    <div className="space-y-6">
      {filters && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-2 space-y-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4 text-primary" /> Filter</span>
            {hasFilter && (
              <button type="button" onClick={filters.onClear} className="text-xs text-primary hover:underline flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <button type="button" onClick={() => filters.onChange("stock", filters.selected.stock === "in" ? "" : "in")}
            className={cn("w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left",
              filters.selected.stock === "in" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}>
            <span className={cn("h-4 w-4 rounded border flex items-center justify-center",
              filters.selected.stock === "in" ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
              {filters.selected.stock === "in" && <Check className="h-3 w-3" />}
            </span>
            In stock only
          </button>
          <FacetList title="Part type" options={filters.facets.parts} value={filters.selected.part} onPick={(v) => filters.onChange("part", v)} />
          <FacetList title="Brand" options={filters.facets.brands} value={filters.selected.brand} onPick={(v) => filters.onChange("brand", v)} />
          <FacetList title="Price" options={filters.facets.prices} value={filters.selected.price} onPick={(v) => filters.onChange("price", v)} />
        </div>
      )}

      {isLoading && <div className="space-y-2 px-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>}

      {data && (
        <>
          <Section icon={Tag} title="Shop by Brand">
            {data.brands.slice(0, BRANDS_SHOWN).map((e) => <NavRow key={e.path} e={e} active={active} />)}
            <Link to="/brands" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-primary/5 font-medium">
              <Plus className="h-4 w-4" /> All {data.brands.length} brands
            </Link>
          </Section>
          <Section icon={Wrench} title="Shop by Part">
            {data.parts.slice(0, PARTS_SHOWN).map((e) => <NavRow key={e.path} e={e} active={active} />)}
            <Link to="/parts" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-primary/5 font-medium">
              <Plus className="h-4 w-4" /> All {data.parts.length} part types
            </Link>
          </Section>
          <Section icon={Smartphone} title="Phones by Price">
            {data.phonePrices.map((e) => <NavRow key={e.path} e={{ ...e, name: e.name.replace(/^Mobile Phones /, "") }} active={active} />)}
          </Section>
        </>
      )}

      <Section icon={Wrench} title="Services">
        <Link to="/book-repair" className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">Book a repair</Link>
        <Link to="/request-part" className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">Request a part</Link>
        <Link to="/track-repair" className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">Track my repair</Link>
      </Section>
    </div>
  );
}

/** Desktop: sticky, scrollable left pane. */
export function CatalogSidebar({ active, filters, stickyTop = "lg:top-[7.5rem]", className }:
  { active?: string; filters?: SidebarFilters; stickyTop?: string; className?: string }) {
  return (
    <aside className={cn("hidden lg:block w-64 xl:w-72 shrink-0", className)}>
      <div className={cn("sticky max-h-[calc(100vh-8.5rem)] overflow-y-auto overscroll-contain thin-scrollbar rounded-2xl border border-border/60 bg-card p-3", stickyTop)}>
        <SidebarContent active={active} filters={filters} />
      </div>
    </aside>
  );
}

/** Mobile / tablet: the same pane in a left drawer. */
export function MobileSidebar({ active, filters, label = "Browse & filter" }:
  { active?: string; filters?: SidebarFilters; label?: string }) {
  const count = filters ? Object.values(filters.selected).filter(Boolean).length : 0;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden gap-2">
          <SlidersHorizontal className="h-4 w-4" /> {label}{count > 0 && <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5">{count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[360px] overflow-y-auto">
        <SheetHeader><SheetTitle>Browse</SheetTitle></SheetHeader>
        <div className="mt-4"><SidebarContent active={active} filters={filters} /></div>
      </SheetContent>
    </Sheet>
  );
}
