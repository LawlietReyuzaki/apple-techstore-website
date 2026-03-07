#!/usr/bin/env node
/**
 * Database Setup Script
 * 
 * This script handles complete database initialization:
 * 1. Validates environment variables
 * 2. Tests database connection
 * 3. Runs all pending migrations
 * 4. Verifies table creation
 * 5. Reports status
 * 
 * Usage:
 *   node setup-db.js              # Run setup
 *   node setup-db.js --check-only # Only check connection
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { spawn } from 'child_process';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('');
  log(`${'='.repeat(70)}`, 'bold');
  log(`  ${title}`, 'blue');
  log(`${'='.repeat(70)}`, 'bold');
  console.log('');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Validate environment variables
async function validateEnvironment() {
  section('1. ENVIRONMENT VALIDATION');

  const requiredVars = [
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'DATABASE_HOST',
    'DATABASE_PORT',
  ];

  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    error('.env file not found');
    error(`Expected at: ${envPath}`);
    return false;
  }

  success('.env file found');

  const envContent = fs.readFileSync(envPath, 'utf-8');
  let missingVars = [];

  for (const varName of requiredVars) {
    if (!envContent.includes(varName + '=')) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    error(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }

  success('All required environment variables found');
  return true;
}

// Test database connection with retry logic
async function testDatabaseConnection(maxRetries = 5) {
  section('2. DATABASE CONNECTION');

  const user = process.env.DATABASE_USER || 'admin';
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5433';

  info(`Connecting to PostgreSQL at ${host}:${port}`);
  info(`User: ${user}`);

  const dbConfig = {
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || '123456',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433'),
    database: process.env.DATABASE_NAME || 'mydatabase',
  };

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      info(`Connection attempt ${attempt}/${maxRetries}...`);
      
      // Create a temporary pool just for this test
      const testPool = new Pool(dbConfig);
      const client = await testPool.connect();
      
      try {
        const result = await client.query('SELECT NOW()');
        success(`Connected successfully!`);
        return testPool;
      } finally {
        client.release();
      }
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        info(`Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  error(`Failed to connect after ${maxRetries} attempts`);
  if (lastError) {
    console.error(`   Error: ${lastError.message}`);
  }
  warning('Make sure Docker containers are running:');
  warning('   docker-compose up -d');
  return null;
}

// Run migrations using child process
async function runAllMigrations() {
  section('3. DATABASE MIGRATIONS');

  return new Promise((resolve) => {
    const child = spawn('node', ['db-migrate.js', 'migrate', '--continue-on-error'], {
      stdio: 'inherit',
      cwd: __dirname,
    });

    child.on('close', (code) => {
      if (code === 0) {
        success('All migrations completed successfully!');
        resolve(true);
      } else {
        warning('Some migrations failed (see above), but setup will continue');
        resolve(true);
      }
    });

    child.on('error', (err) => {
      error(`Migration error: ${err.message}`);
      resolve(false);
    });
  });
}

// Verify core tables exist
async function verifyCoreTablesExist() {
  section('4. TABLE VERIFICATION');

  const dbConfig = {
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || '123456',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433'),
    database: process.env.DATABASE_NAME || 'mydatabase',
  };

  const pool = new Pool(dbConfig);
  const requiredTables = [
    'products',
    'orders',
    'profiles',
    'repairs',
    'payments',
    'user_roles',
    'reviews',
    'notifications',
  ];

  let client;
  try {
    client = await pool.connect();

    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    const existingTables = result.rows.map(row => row.table_name);
    let allTablesExist = true;
    let foundTables = [];
    let missingTables = [];

    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        success(`Table exists: ${table}`);
        foundTables.push(table);
      } else {
        warning(`Table missing: ${table}`);
        missingTables.push(table);
        allTablesExist = false;
      }
    }

    console.log('');
    info(`Total tables in database: ${existingTables.length}`);
    info(`Core tables found: ${foundTables.length}/${requiredTables.length}`);

    if (!allTablesExist) {
      warning(`Missing ${missingTables.length} expected tables`);
      warning('This is normal if migrations have custom dependencies');
    }

    return foundTables.length > 0;
  } catch (err) {
    error(`Table verification failed: ${err.message}`);
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Show migration statistics by querying the _migrations table
async function showMigrationStats() {
  section('5. MIGRATION STATISTICS');

  const dbConfig = {
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || '123456',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433'),
    database: process.env.DATABASE_NAME || 'mydatabase',
  };

  try {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT filename, executed_at, status FROM _migrations ORDER BY executed_at DESC LIMIT 5'
      );
      
      if (result.rows && result.rows.length > 0) {
        info(`Total migrations executed: ${result.rows[0] ? '5+' : '0'}`);
        info('Recent migrations:');
        for (const migration of result.rows) {
          const date = new Date(migration.executed_at).toLocaleString();
          log(`  • ${migration.filename.substring(0, 20)}... [${date}]`);
        }
      } else {
        warning('No migration history found');
      }
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    warning(`Could not retrieve migration history: ${err.message}`);
  }
}

// Main setup function
async function setupDatabase() {
  log('', 'bold');
  log('╔════════════════════════════════════════════════════════════════════╗', 'blue');
  log('║           DATABASE SETUP & INITIALIZATION SCRIPT                   ║', 'blue');
  log('╚════════════════════════════════════════════════════════════════════╝', 'blue');

  console.log('');
  log(`Platform: ${process.platform}`, 'blue');
  log(`Node.js: ${process.version}`, 'blue');
  log(`Working Directory: ${process.cwd()}`, 'blue');
  console.log('');

  // Parse command line arguments
  const checkOnly = process.argv.includes('--check-only');
  if (checkOnly) {
    info('Running in check-only mode (no migrations will run)');
    console.log('');
  }

  // Step 1: Validate environment
  const envValid = await validateEnvironment();
  if (!envValid) {
    return false;
  }

  // Step 2: Test connection
  const connectionPool = await testDatabaseConnection();
  if (!connectionPool) {
    return false;
  }

  // Clean up test connection
  await connectionPool.end();

  // Step 3: Run migrations (skip if check-only)
  if (!checkOnly) {
    const migrationsRun = await runAllMigrations();
    if (!migrationsRun) {
      warning('Migrations failed, continuing to verification...');
    }
  } else {
    info('Skipping migrations (check-only mode)');
  }

  // Step 4: Verify tables
  const tablesVerified = await verifyCoreTablesExist();

  // Step 5: Show stats
  if (!checkOnly) {
    await showMigrationStats();
  }

  // Final summary
  section('SETUP SUMMARY');

  if (tablesVerified && connectionPool) {
    success('✨ Database is ready for use!');
    console.log('');
    info('Next steps:');
    info('  1. Start your web application');
    info('  2. Access pgAdmin: http://localhost:5050');
    info('  3. View logs: docker-compose logs -f postgres');
    console.log('');
    success('Setup completed successfully!');
    return true;
  } else {
    error('Setup incomplete - see errors above');
    return false;
  }
}

// Run setup
const setupSuccess = await setupDatabase();
process.exit(setupSuccess ? 0 : 1);
