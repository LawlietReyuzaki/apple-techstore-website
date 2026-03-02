import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

let pool;

if (process.env.CLOUD_SQL_CONNECTION_NAME) {
  // ── Cloud Run: use Cloud SQL Connector (no IP allowlist needed) ──
  // Requires CLOUD_SQL_CONNECTION_NAME=project:region:instance in Cloud Run env vars
  const { Connector } = await import('@google-cloud/cloud-sql-connector');
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME,
    ipType: 'PUBLIC',
  });
  pool = new Pool({
    ...clientOpts,
    user:     process.env.DATABASE_USER     || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME     || 'mydatabase',
    max: 10,
    idleTimeoutMillis: 30000,
  });
  console.log('DB: connected via Cloud SQL Connector →', process.env.CLOUD_SQL_CONNECTION_NAME);
} else {
  // ── Local dev: direct TCP connection ────────────────────────────
  pool = new Pool({
    host:     process.env.DATABASE_HOST     || 'localhost',
    port:     parseInt(process.env.DATABASE_PORT || '5433'),
    database: process.env.DATABASE_NAME     || 'mydatabase',
    user:     process.env.DATABASE_USER     || 'admin',
    password: process.env.DATABASE_PASSWORD || '123456',
    max: 10,
    idleTimeoutMillis: 30000,
  });
  console.log('DB: connected via TCP →', process.env.DATABASE_HOST || 'localhost');
}

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

export default pool;
