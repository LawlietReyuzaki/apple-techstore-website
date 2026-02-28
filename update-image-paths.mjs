import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host:     '34.44.189.3',
  port:     5432,
  database: 'mydatabase',
  user:     'postgres',
  password: '(Dilbarappletechstore)',
});

const GCS = 'https://storage.googleapis.com/dilbar-product-images';

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to Cloud SQL...\n');

    // 1. products.images (TEXT[])
    const r1 = await client.query(`
      UPDATE products
      SET images = (
        SELECT array_agg(
          CASE WHEN elem LIKE 'http%' THEN elem
               ELSE '${GCS}/' || elem
          END
        )
        FROM unnest(images) AS elem
      )
      WHERE images IS NOT NULL
        AND array_length(images, 1) > 0
        AND images[1] NOT LIKE 'http%'
    `);
    console.log(`products updated:       ${r1.rowCount}`);

    // 2. shop_items.images (TEXT[])
    const r2 = await client.query(`
      UPDATE shop_items
      SET images = (
        SELECT array_agg(
          CASE WHEN elem LIKE 'http%' THEN elem
               ELSE '${GCS}/' || elem
          END
        )
        FROM unnest(images) AS elem
      )
      WHERE images IS NOT NULL
        AND array_length(images, 1) > 0
        AND images[1] NOT LIKE 'http%'
    `);
    console.log(`shop_items updated:     ${r2.rowCount}`);

    // 3. spare_parts.images (TEXT[])
    const r3 = await client.query(`
      UPDATE spare_parts
      SET images = (
        SELECT array_agg(
          CASE WHEN elem LIKE 'http%' THEN elem
               ELSE '${GCS}/' || elem
          END
        )
        FROM unnest(images) AS elem
      )
      WHERE images IS NOT NULL
        AND array_length(images, 1) > 0
        AND images[1] NOT LIKE 'http%'
    `);
    console.log(`spare_parts updated:    ${r3.rowCount}`);

    // 4. shop_categories.image_url (TEXT)
    const r4 = await client.query(`
      UPDATE shop_categories
      SET image_url = '${GCS}/' || image_url
      WHERE image_url IS NOT NULL
        AND image_url NOT LIKE 'http%'
        AND image_url != ''
    `);
    console.log(`shop_categories updated: ${r4.rowCount}`);

    console.log('\nAll image paths updated to GCS URLs.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
