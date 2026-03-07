import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database configuration from environment variables or defaults
const dbConfig = {
  user: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || '123456',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5433'),
  database: process.env.DATABASE_NAME || 'mydatabase',
};

// Create connection pool
const pool = new Pool(dbConfig);

// Get single connection for migrations
const getClient = async () => {
  return pool.connect();
};

// Test database connection
export const testConnection = async () => {
  const client = await getClient();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  } finally {
    client.release();
  }
};

// Get migration files sorted by timestamp
const getMigrationFiles = () => {
  const migrationsDir = path.join(__dirname, './supabase/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.warn(`⚠️  Migrations directory not found: ${migrationsDir}`);
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
};

// Run a single migration file
const runMigrationFile = async (client, filePath, fileName) => {
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Skip empty files
    if (!sql.trim()) {
      console.log(`⏭️  Skipped (empty): ${fileName}`);
      return true;
    }

    await client.query(sql);
    console.log(`✅ Executed: ${fileName}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed: ${fileName}`);
    console.error(`   Error: ${err.message}`);
    return false;
  }
};

// Run all migrations
export const runMigrations = async (continueOnError = false) => {
  let client;
  try {
    client = await getClient();

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending'
      );
    `);

    const migrationFiles = getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found');
      return true;
    }

    console.log(`\n🔄 Found ${migrationFiles.length} migration files\n`);

    let successful = 0;
    let failed = 0;

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, './supabase/migrations', file);

      // Check if already executed
      const existingResult = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [file],
      );

      if (existingResult.rows.length > 0) {
        console.log(`⏭️  Already executed: ${file}`);
        continue;
      }

      // Run the migration
      const success = await runMigrationFile(client, filePath, file);

      if (success) {
        // Record successful migration
        await client.query(
          'INSERT INTO _migrations (filename, status) VALUES ($1, $2)',
          [file, 'completed'],
        );
        successful++;
      } else {
        failed++;
        if (!continueOnError) {
          console.error('\n❌ Migration failed. Stopping.');
          return false;
        }
      }
    }

    console.log(
      `\n✅ Migration complete: ${successful} successful, ${failed} failed`,
    );
    return failed === 0;
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Rollback last migration
export const rollbackMigration = async () => {
  let client;
  try {
    client = await getClient();

    const result = await client.query(
      'SELECT filename FROM _migrations WHERE status = $1 ORDER BY executed_at DESC LIMIT 1',
      ['completed'],
    );

    if (result.rows.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return true;
    }

    const { filename } = result.rows[0];
    console.log(`🔄 Rolling back: ${filename}`);

    // Note: Rollback requires reverse migrations to be created
    console.log(
      '⚠️  Rollback requires creating reverse migration files manually',
    );
    console.log('   Mark migration as rolled back:');

    await client.query('UPDATE _migrations SET status = $1 WHERE filename = $2', [
      'rolled_back',
      filename,
    ]);

    console.log(`✅ Marked as rolled back: ${filename}`);
    return true;
  } catch (err) {
    console.error('❌ Rollback error:', err.message);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Get migration history
export const getMigrationHistory = async () => {
  let client;
  try {
    client = await getClient();

    const result = await client.query(
      'SELECT filename, executed_at, status FROM _migrations ORDER BY executed_at DESC',
    );

    if (result.rows.length === 0) {
      console.log('ℹ️  No migration history found');
      return [];
    }

    console.log('\n📋 Migration History:\n');
    console.table(result.rows);
    return result.rows;
  } catch (err) {
    console.error('❌ Error reading migration history:', err.message);
    return [];
  } finally {
    if (client) {
      client.release();
    }
  }
};

// CLI commands
const command = process.argv[2];
const args = process.argv.slice(3);

(async () => {
  switch (command) {
    case 'migrate':
      const continueOnError = args.includes('--continue-on-error');
      const success = await runMigrations(continueOnError);
      await pool.end();
      process.exit(success ? 0 : 1);

    case 'rollback':
      await rollbackMigration();
      await pool.end();
      process.exit(0);

    case 'history':
      await getMigrationHistory();
      await pool.end();
      process.exit(0);

    case 'test':
      const connected = await testConnection();
      await pool.end();
      process.exit(connected ? 0 : 1);

    default:
      console.log(`
🗄️  Migration Tool Usage:

Commands:
  migrate              Run all pending migrations
  migrate --continue-on-error   Continue even if a migration fails
  rollback             Rollback last migration (mark as rolled back)
  history              Show migration history
  test                 Test database connection

Examples:
  node db-migrate.js migrate
  node db-migrate.js test
  node db-migrate.js history
`);
      await pool.end();
      process.exit(0);
  }
})();
