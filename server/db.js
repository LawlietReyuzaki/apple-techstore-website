import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL if set (Cloud Run / production).
// Fall back to individual env vars for local development.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString:        process.env.DATABASE_URL,
      max:                     10,
      idleTimeoutMillis:       30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host:     process.env.DATABASE_HOST     || 'localhost',
      port:     parseInt(process.env.DATABASE_PORT || '5433'),
      database: process.env.DATABASE_NAME     || 'mydatabase',
      user:     process.env.DATABASE_USER     || 'admin',
      password: process.env.DATABASE_PASSWORD || '123456',
      max:      10,
      idleTimeoutMillis:       30000,
      connectionTimeoutMillis: 10000,
    });

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

export default pool;
