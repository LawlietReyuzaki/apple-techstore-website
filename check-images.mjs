import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '34.44.189.3', port: 5432,
  database: 'mydatabase', user: 'postgres',
  password: '(Dilbarappletechstore)',
});

const client = await pool.connect();

const { rows } = await client.query(`
  SELECT id, name, images[1] AS first_image
  FROM products
  WHERE images IS NOT NULL AND array_length(images,1) > 0
  LIMIT 5
`);

console.log('Sample image URLs from DB:\n');
rows.forEach(r => console.log(r.name, '\n  ->', r.first_image, '\n'));

client.release();
await pool.end();
