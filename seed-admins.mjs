/**
 * seed-admins.mjs
 * Run this ONCE to create admin accounts in the DB.
 * Usage: node seed-admins.mjs
 *
 * For Cloud SQL (production):
 *   DATABASE_HOST=34.44.189.3 DATABASE_USER=postgres DATABASE_PASSWORD="(Dilbarappletechstore)" DATABASE_NAME=mydatabase node seed-admins.mjs
 *
 * For local Docker:
 *   node seed-admins.mjs   (uses defaults from .env)
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DATABASE_HOST     || 'localhost',
  port:     parseInt(process.env.DATABASE_PORT || '5433'),
  user:     process.env.DATABASE_USER     || 'admin',
  password: process.env.DATABASE_PASSWORD || '123456',
  database: process.env.DATABASE_NAME     || 'mydatabase',
});

const ADMINS = [
  { email: 'email.hassan.cs@gmail.com', password: 'admin123', name: 'Hassan Admin' },
  { email: 'mdcreationz22@gmail.com',   password: 'admin123', name: 'MD Admin' },
];

const client = await pool.connect();

for (const admin of ADMINS) {
  const hashed = await bcrypt.hash(admin.password, 10);

  // Check if user already exists
  const existing = await client.query(
    'SELECT id FROM auth.users WHERE email = $1',
    [admin.email]
  );

  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    // Update password
    await client.query(
      'UPDATE auth.users SET encrypted_password = $1, email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = $2',
      [hashed, userId]
    );
    console.log(`✅ Updated existing user: ${admin.email}`);
  } else {
    const ins = await client.query(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
       VALUES ($1, $2, $3, now()) RETURNING id`,
      [admin.email, hashed, JSON.stringify({ full_name: admin.name })]
    );
    userId = ins.rows[0].id;
    console.log(`✅ Created new user: ${admin.email} (id: ${userId})`);
  }

  // Ensure admin role — delete any existing role then insert admin
  await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
  await client.query(
    `INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')`,
    [userId]
  );
  console.log(`   → role set to admin`);
}

client.release();
await pool.end();
console.log('\nDone. Admin accounts ready.');
