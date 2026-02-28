// Foreign key relationships — tells the query builder how to JOIN tables
// Format: { [childTable]: { [relationName]: { localKey, table, foreignKey } } }

const relations = {
  shop_items: {
    shop_categories: { localKey: 'category_id',  table: 'shop_categories', foreignKey: 'id' },
    shop_brands:     { localKey: 'brand_id',      table: 'shop_brands',     foreignKey: 'id' },
    shop_models:     { localKey: 'model_id',      table: 'shop_models',     foreignKey: 'id' },
    shop_part_types: { localKey: 'part_type_id',  table: 'shop_part_types', foreignKey: 'id' },
  },
  spare_parts: {
    phone_models:    { localKey: 'phone_model_id',  table: 'phone_models',    foreignKey: 'id' },
    part_categories: { localKey: 'part_category_id',table: 'part_categories', foreignKey: 'id' },
    part_types:      { localKey: 'part_type_id',    table: 'part_types',      foreignKey: 'id' },
    part_qualities:  { localKey: 'quality_id',      table: 'part_qualities',  foreignKey: 'id' },
  },
  phone_models: {
    spare_parts_brands: { localKey: 'brand_id', table: 'spare_parts_brands', foreignKey: 'id' },
  },
  products: {
    categories: { localKey: 'category_id', table: 'categories', foreignKey: 'id' },
  },
  shop_brands: {
    shop_categories: { localKey: 'category_id', table: 'shop_categories', foreignKey: 'id' },
  },
  shop_models: {
    shop_brands: { localKey: 'brand_id', table: 'shop_brands', foreignKey: 'id' },
  },
  shop_part_types: {
    shop_categories: { localKey: 'category_id', table: 'shop_categories', foreignKey: 'id' },
  },
  spare_parts_brands: {
    phone_categories: { localKey: 'phone_category_id', table: 'phone_categories', foreignKey: 'id' },
  },
  part_types: {
    part_categories: { localKey: 'category_id', table: 'part_categories', foreignKey: 'id' },
  },
  order_items: {
    orders:      { localKey: 'order_id',      table: 'orders',      foreignKey: 'id' },
    products:    { localKey: 'product_id',    table: 'products',    foreignKey: 'id' },
    shop_items:  { localKey: 'shop_item_id',  table: 'shop_items',  foreignKey: 'id' },
    spare_parts: { localKey: 'spare_part_id', table: 'spare_parts', foreignKey: 'id' },
  },
  orders: {
    payments: { localKey: 'payment_id', table: 'payments', foreignKey: 'id' },
  },
  payments: {
    orders: { localKey: 'order_id', table: 'orders', foreignKey: 'id' },
  },
  repair_notes: {
    repairs: { localKey: 'repair_id', table: 'repairs', foreignKey: 'id' },
  },
  product_colors: {
    products: { localKey: 'product_id', table: 'products', foreignKey: 'id' },
  },
  product_part_types: {
    products: { localKey: 'product_id', table: 'products', foreignKey: 'id' },
  },
  spare_parts_colors: {
    spare_parts: { localKey: 'spare_part_id', table: 'spare_parts', foreignKey: 'id' },
  },
  spare_part_variants: {
    spare_parts: { localKey: 'spare_part_id', table: 'spare_parts', foreignKey: 'id' },
  },
  reviews: {
    products: { localKey: 'product_id', table: 'products', foreignKey: 'id' },
  },
  wishlist: {
    products: { localKey: 'product_id', table: 'products', foreignKey: 'id' },
  },
};

export default relations;
