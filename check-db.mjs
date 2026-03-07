import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

const config = connectionName
  ? {
      host:     `/cloudsql/${connectionName}`,
      database: process.env.DATABASE_NAME     || 'mydatabase',
      user:     process.env.DATABASE_USER     || 'admin',
      password: process.env.DATABASE_PASSWORD || '123456',
      connectionTimeoutMillis: 5000,
    }
  : {
      host:     process.env.DATABASE_HOST     || 'localhost',
      port:     parseInt(process.env.DATABASE_PORT || '5433'),
      database: process.env.DATABASE_NAME     || 'mydatabase',
      user:     process.env.DATABASE_USER     || 'admin',
      password: process.env.DATABASE_PASSWORD || '123456',
      connectionTimeoutMillis: 5000,
    };

console.log('\n=== DB Connection Check ===');
console.log('Mode    :', connectionName ? `Unix socket (/cloudsql/${connectionName})` : 'TCP');
console.log('Host    :', config.host);
if (config.port) console.log('Port    :', config.port);
console.log('Database:', config.database);
console.log('User    :', config.user);
console.log('Password:', config.password ? '***' : '(none)');
console.log('');

const pool = new Pool(config);

try {
  const client = await pool.connect();
  console.log('✓ Connected successfully\n');

  const checks = [
    { label: 'PostgreSQL version', sql: 'SELECT version()' },
    { label: 'auth.users count',   sql: 'SELECT count(*) FROM auth.users' },
    { label: 'profiles count',     sql: 'SELECT count(*) FROM profiles' },
    { label: 'user_roles count',   sql: 'SELECT count(*) FROM user_roles' },
    { label: 'products count',     sql: 'SELECT count(*) FROM products' },
    { label: 'categories count',   sql: 'SELECT count(*) FROM categories' },
  ];

  for (const { label, sql } of checks) {
    try {
      const res = await client.query(sql);
      const val = res.rows[0]?.version ?? res.rows[0]?.count ?? 'ok';
      console.log(`✓ ${label}: ${val}`);
    } catch (e) {
      console.log(`✗ ${label}: ${e.message}`);
    }
  }

  client.release();
} catch (e) {
  console.error('✗ Connection FAILED:', e.message);
}

await pool.end();
