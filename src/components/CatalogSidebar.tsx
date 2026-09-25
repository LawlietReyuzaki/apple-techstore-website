import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, Layers, SlidersHorizontal, Smartphone, Tag, Wrench, X } from "lucide-react";
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
export interface TreeLink { name: string; path: string; count: number }
export interface SidebarTree { title: string; groups: { name: string | null; items: TreeLink[] }[] }

// ── Building blocks ───────────────────────────────────────────────────────

/** Collapsible section with a chevron header (the accordion rows of the pane). */
function Section({ icon: Icon, title, defaultOpen = true, children }:
  { icon?: typeof Tag; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/70 last:border-b-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-foreground hover:text-primary">
        <span className="flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-primary" />}{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="pb-3 -mt-0.5">{children}</div>}
    </div>
  );
}

function Row({ name, path, count, active }: TreeLink & { active?: string }) {
  const on = active === path;
  return (
    <Link to={path}
      className={cn("flex items-center justify-between rounded-md px-2 py-[5px] text-[13px] transition-colors",
        on ? "bg-primary/10 text-primary font-medium" : "text-foreground/90 hover:bg-muted hover:text-primary")}>
      <span className="truncate">{name}</span>
      {count > 0 && <span className="text-[11px] text-muted-foreground ml-2 shrink-0">{count.toLocaleString()}</span>}
    </Link>
  );
}

/** A list that shows the first `limit` rows and expands in place. */
function ExpandableList({ items, active, limit = 10, allTo, allLabel }:
  { items: TreeLink[]; active?: string; limit?: number; allTo?: string; allLabel?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, limit);
  return (
    <div className="space-y-px">
      {shown.map((e) => <Row key={e.path} {...e} active={active} />)}
      {items.length > limit && (
        <button type="button" onClick={() => setAll((a) => !a)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:underline">
          <ChevronDown className={cn("h-3 w-3 transition-transform", all && "rotate-180")} />
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
      {allTo && (
        <Link to={allTo} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-primary">
          {allLabel} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/** Nested tree: groups (e.g. Galaxy A / Galaxy S) that open to reveal their models. */
function Tree({ tree, active, expanded }: { tree: SidebarTree; active?: string; expanded?: boolean }) {
  const activeGroup = tree.groups.findIndex((g) => g.items.some((i) => i.path === active));
  const [open, setOpen] = useState<Record<number, boolean>>({ [activeGroup >= 0 ? activeGroup : 0]: true });
  if (tree.groups.length === 1) return <ExpandableList items={tree.groups[0].items} active={active} limit={expanded ? Infinity : 14} />;
  return (
    <div className="space-y-px">
      {tree.groups.map((g, i) => (
        <div key={g.name ?? i}>
          <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
            className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted">
            <span className="flex items-center gap-1.5">
              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open[i] && "rotate-90")} />
              {g.name || "Other"}
            </span>
            <span className="text-[11px] text-muted-foreground">{g.items.length}</span>
          </button>
          {open[i] && <div className="pl-4 pb-1"><ExpandableList items={g.items} active={active} limit={expanded ? Infinity : 12} /></div>}
        </div>
      ))}
    </div>
  );
}

function FacetList({ title, options, value, onPick }: { title: string; options: FacetOption[]; value: string; onPick: (v: string) => void }) {
  const [more, setMore] = useState(false);
  if (!options.length && !value) return null;
  const shown = more ? options : options.slice(0, 7);
  return (
    <div className="pt-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-1">{title}</div>
      <div className="space-y-px">
        {shown.map((o) => {
          const on = value === o.slug;
          return (
            <button key={o.slug} type="button" onClick={() => onPick(on ? "" : o.slug)}
              className={cn("w-full flex items-center gap-2 rounded-md px-2 py-[5px] text-[13px] text-left transition-colors",
                on ? "text-primary font-medium" : "hover:bg-muted text-foreground/90")}>
              <span className={cn("h-3.5 w-3.5 rounded-[3px] border flex items-center justify-center shrink-0",
                on ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50")}>
                {on && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className="flex-1 truncate">{o.name}</span>
              <span className="text-[11px] text-muted-foreground">{o.count.toLocaleString()}</span>
            </button>
          );
        })}
        {options.length > 7 && (
          <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:underline">
            <ChevronDown className={cn("h-3 w-3 transition-transform", more && "rotate-180")} />{more ? "Show less" : `Show all ${options.length}`}
          </button>
        )}
      </div>
    </div>
  );
}

const asLinks = (list: MenuEntry[]): TreeLink[] => list.map((e) => ({ name: e.name, path: e.path, count: e.count }));

// ── Pane content ──────────────────────────────────────────────────────────

/** The pane's content: filters and the page's own tree first, then Shop by Brand / Part / Price. */
export function SidebarContent({ active, filters, tree, plain, expanded }:
  { active?: string; filters?: SidebarFilters; tree?: SidebarTree; plain?: boolean; expanded?: boolean }) {
  const { data, isLoading } = useCatalogMenu();
  const lim = (n: number) => (expanded ? Infinity : n);
  const hasFilter = filters && Object.values(filters.selected).some(Boolean);
  const contextual = !!(filters || tree);

  return (
    <div className={cn(!plain && "rounded-xl border border-border bg-card px-3")}>
      {filters && (
        <Section icon={SlidersHorizontal} title="Filter">
          {hasFilter && (
            <button type="button" onClick={filters.onClear} className="flex items-center gap-1 px-2 pb-1 text-xs font-medium text-primary hover:underline">
              <X className="h-3 w-3" /> Clear all filters
            </button>
          )}
          <button type="button" onClick={() => filters.onChange("stock", filters.selected.stock === "in" ? "" : "in")}
            className={cn("w-full flex items-center gap-2 rounded-md px-2 py-[5px] text-[13px] text-left",
              filters.selected.stock === "in" ? "text-primary font-medium" : "hover:bg-muted")}>
            <span className={cn("h-3.5 w-3.5 rounded-[3px] border flex items-center justify-center",
              filters.selected.stock === "in" ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50")}>
              {filters.selected.stock === "in" && <Check className="h-2.5 w-2.5" />}
            </span>
            In stock only
          </button>
          <FacetList title="Part type" options={filters.facets.parts} value={filters.selected.part} onPick={(v) => filters.onChange("part", v)} />
          <FacetList title="Brand" options={filters.facets.brands} value={filters.selected.brand} onPick={(v) => filters.onChange("brand", v)} />
          <FacetList title="Price" options={filters.facets.prices} value={filters.selected.price} onPick={(v) => filters.onChange("price", v)} />
        </Section>
      )}

      {tree && tree.groups.length > 0 && (
        <Section icon={Layers} title={tree.title}><Tree tree={tree} active={active} expanded={expanded} /></Section>
      )}

      {isLoading && <div className="space-y-2 py-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>}

      {data && (
        <>
          <Section icon={Wrench} title="Shop by Part" defaultOpen={expanded || !contextual}>
            <ExpandableList items={asLinks(data.parts)} active={active} limit={lim(10)} allTo="/parts" allLabel="Browse all part types" />
          </Section>
          <Section icon={Tag} title="Shop by Brand" defaultOpen={expanded || !contextual}>
            <ExpandableList items={asLinks(data.brands)} active={active} limit={lim(12)} allTo="/brands" allLabel="Browse all brands" />
          </Section>
          <Section icon={Smartphone} title="Phones by Price" defaultOpen={expanded || !contextual}>
            <ExpandableList items={asLinks(data.phonePrices).map((e) => ({ ...e, name: e.name.replace(/^Mobile Phones /, "") }))} active={active} limit={lim(8)} />
          </Section>
        </>
      )}

      <Section icon={Wrench} title="Services" defaultOpen={false}>
        <ExpandableList active={active} items={[
          { name: "Book a repair", path: "/book-repair", count: 0 },
          { name: "Track my repair", path: "/track-repair", count: 0 },
          { name: "Request a part", path: "/request-part", count: 0 },
        ]} />
      </Section>
    </div>
  );
}

/** Desktop: full-height left pane that scrolls with the page, every list fully expanded. */
export function CatalogSidebar({ active, filters, tree, className }:
  { active?: string; filters?: SidebarFilters; tree?: SidebarTree; className?: string }) {
  return (
    <aside className={cn("hidden lg:block w-64 xl:w-72 shrink-0 self-start", className)}>
      <SidebarContent active={active} filters={filters} tree={tree} expanded />
    </aside>
  );
}

/** Mobile / tablet: the same pane in a left drawer. */
export function MobileSidebar({ active, filters, tree, label = "Browse & filter" }:
  { active?: string; filters?: SidebarFilters; tree?: SidebarTree; label?: string }) {
  const count = filters ? Object.values(filters.selected).filter(Boolean).length : 0;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden gap-2">
          <SlidersHorizontal className="h-4 w-4" /> {label}{count > 0 && <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5">{count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[360px] overflow-y-auto p-4">
        <SheetHeader className="mb-2"><SheetTitle>Browse</SheetTitle></SheetHeader>
        <SidebarContent active={active} filters={filters} tree={tree} plain />
      </SheetContent>
    </Sheet>
  );
}
