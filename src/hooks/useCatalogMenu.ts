import { useQuery } from "@tanstack/react-query";

export interface MenuEntry { name: string; slug: string; path: string; count: number; group?: string }
export interface CatalogMenu { brands: MenuEntry[]; parts: MenuEntry[]; phonePrices: MenuEntry[] }

/** Brands, part types and phone price ranges from the catalog layer (for menus and the side pane). */
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
