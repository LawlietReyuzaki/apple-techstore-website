export interface CatalogItem {
  item_id: string;
  source_table: "products" | "spare_parts" | "shop_items";
  name: string;
  brand: string;
  price: number | null;
  regular_price: number | null;
  stock: number | null;
  in_stock?: boolean;
  url_path: string;
  main_image: string | null;
}

const TYPE_MAP = { products: "product", spare_parts: "spare_part", shop_items: "shop_item" } as const;

/** Catalog rows → the shape ShopItemCard expects (links go to the item's existing URL). */
export function toCard(i: CatalogItem) {
  const onSale = i.regular_price != null && i.price != null && i.regular_price > i.price;
  return {
    id: i.item_id,
    name: i.name,
    description: null,
    price: onSale ? i.regular_price! : i.price ?? 0,
    sale_price: onSale ? i.price : null,
    stock: i.stock,
    images: i.main_image ? [i.main_image] : [],
    featured: false,
    condition: null,
    shop_brands: i.brand ? { id: i.brand, name: i.brand } : null,
    _type: TYPE_MAP[i.source_table],
    slug: i.url_path.split("/").pop() || null,
  };
}
