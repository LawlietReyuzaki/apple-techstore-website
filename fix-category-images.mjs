import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '34.44.189.3', port: 5432,
  database: 'mydatabase', user: 'postgres',
  password: '(Dilbarappletechstore)',
});

const client = await pool.connect();

// Show current state
const { rows: cats } = await client.query(
  `SELECT id, name, slug, image_url FROM shop_categories ORDER BY sort_order`
);
console.log('Current image_url values:');
cats.forEach(c => console.log(`  [${c.slug}] → ${c.image_url || 'NULL'}`));

// Map slug → correct local path (served from public/ by Vite/Express)
const correctPaths = {
  'mobile-accessories':            '/assets/categories/mobile-accessories.png',
  'laptop-accessories':            '/assets/categories/laptop-accessories.jpg',
  'computer-accessories':          '/assets/categories/computer-accessories.png',
  'new-used-phones':               '/assets/categories/new-used-phones.jpg',
  'mobile-spare-parts':            '/assets/categories/mobile-spare-parts.png',
  'laptop-computer-spare-parts':   '/assets/categories/laptop-computer-spare-parts.png',
  'protectors-skins':              '/assets/categories/protectors-skins.jpg',
  'power-banks':                   '/assets/categories/power-banks.jpg',
};

console.log('\nRestoring correct paths...');
for (const cat of cats) {
  const correctPath = correctPaths[cat.slug];
  if (correctPath) {
    await client.query(
      `UPDATE shop_categories SET image_url = $1 WHERE id = $2`,
      [correctPath, cat.id]
    );
    console.log(`  ✅ ${cat.name} → ${correctPath}`);
  } else {
    console.log(`  ⚠️  ${cat.name} (slug: ${cat.slug}) — no mapping found, skipped`);
  }
}

client.release();
await pool.end();
console.log('\nDone. Category tile images will now load from /assets/categories/');
