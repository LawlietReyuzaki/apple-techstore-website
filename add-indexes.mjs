import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '34.44.189.3', port: 5432,
  database: 'mydatabase', user: 'postgres',
  password: '(Dilbarappletechstore)',
});

const indexes = [
  // Speeds up the has-images ORDER BY expression
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_has_images
   ON products ((images IS NOT NULL AND array_length(images, 1) > 0))`,

  // Speeds up brand filter
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand
   ON products (brand)`,

  // Speeds up price sort
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price
   ON products (price)`,

  // Speeds up name sort
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name
   ON products (name)`,

  // Speeds up stock filter
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_stock
   ON products (stock)`,

  // Spare parts
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_has_images
   ON spare_parts ((images IS NOT NULL AND array_length(images, 1) > 0))`,
];

const client = await pool.connect();
for (const sql of indexes) {
  const name = sql.match(/idx_\w+/)?.[0] || '?';
  process.stdout.write(`Creating ${name}... `);
  await client.query(sql);
  console.log('done');
}
client.release();
await pool.end();
console.log('\nAll indexes created.');
