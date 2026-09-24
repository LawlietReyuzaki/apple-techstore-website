import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Smartphone, Tag, Wrench } from "lucide-react";

interface MenuEntry { name: string; slug: string; path: string; count: number; group?: string }
interface CatalogMenu { brands: MenuEntry[]; parts: MenuEntry[]; phonePrices: MenuEntry[] }

export function useCatalogMenu() {
  return useQuery({
    queryKey: ["catalog-menu"],
    queryFn: async () => {
      const res = await fetch("/api/catalog/menu");
      if (!res.ok) throw new Error("menu");
      return (await res.json()) as CatalogMenu;
    },
    staleTime: 10 * 60 * 1000,
  });
}

function Row({ icon: Icon, title, all, entries }: { icon: typeof Tag; title: string; all?: string; entries: MenuEntry[] }) {
  if (!entries.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        {all && (
          <Link to={all} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map((e) => (
          <Link key={e.path} to={e.path}
            className="px-3 py-1.5 rounded-full text-sm bg-muted/60 border border-border/50 text-foreground hover:border-primary/50 hover:bg-muted transition-colors">
            {e.name} <span className="text-xs text-muted-foreground">({e.count.toLocaleString()})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Homepage block: Shop by Brand / Part / Phone price — links to the new category pages. */
export function CatalogShortcuts() {
  const { data } = useCatalogMenu();
  if (!data) return null;
  return (
    <section className="container py-6 sm:py-8">
      <div className="rounded-2xl border border-border/50 bg-card/70 p-4 sm:p-6 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Find exactly what you need</h2>
        <Row icon={Tag} title="Shop by Brand" all="/brands" entries={data.brands.slice(0, 16)} />
        <Row icon={Wrench} title="Shop by Part" all="/parts" entries={data.parts} />
        <Row icon={Smartphone} title="Phones by Price" entries={data.phonePrices} />
      </div>
    </section>
  );
}
