import { Pool, Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface MigrationHistory {
  id: number;
  filename: string;
  executed_at: Date;
  status: 'pending' | 'completed' | 'rolled_back';
}

export class DatabaseConnection {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = {
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ...config,
    };

    this.pool = new Pool(this.config);
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database connection successful!');
      console.log('Server time:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', (error as Error).message);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a raw query
   */
  async query<T = any>(text: string, values?: any[]): Promise<T[]> {
    const result = await this.pool.query(text, values);
    return result.rows as T[];
  }

  /**
   * Get active database info
   */
  async getDatabaseInfo(): Promise<{
    version: string;
    database: string;
    user: string;
  } | null> {
    try {
      const result = await this.query(
        'SELECT VERSION() as version, CURRENT_DATABASE() as database, CURRENT_USER as user',
      );
      return result[0] as any;
    } catch (error) {
      console.error('Error getting database info:', (error as Error).message);
      return null;
    }
  }

  /**
   * Migrate database
   */
  async migrate(options?: { continueOnError?: boolean }): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      // Create migrations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'pending'
        );
      `);

      const migrationFiles = this.getMigrationFiles();

      if (migrationFiles.length === 0) {
        console.log('ℹ️  No migration files found');
        return true;
      }

      console.log(`\n🔄 Found ${migrationFiles.length} migration files\n`);

      let successful = 0;
      let failed = 0;

      for (const file of migrationFiles) {
        const sql = fs.readFileSync(file, 'utf-8');

        // Skip empty files
        if (!sql.trim()) {
          console.log(`⏭️  Skipped (empty): ${path.basename(file)}`);
          continue;
        }

        // Check if already executed
        const existingResult = await client.query(
          'SELECT id FROM _migrations WHERE filename = $1',
          [path.basename(file)],
        );

        if (existingResult.rows.length > 0) {
          console.log(`⏭️  Already executed: ${path.basename(file)}`);
          continue;
        }

        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO _migrations (filename, status) VALUES ($1, $2)',
            [path.basename(file), 'completed'],
          );
          console.log(`✅ Executed: ${path.basename(file)}`);
          successful++;
        } catch (error) {
          console.error(`❌ Failed: ${path.basename(file)}`);
          console.error(`   Error: ${(error as Error).message}`);
          failed++;

          if (!options?.continueOnError) {
            console.error('\n❌ Migration failed. Stopping.');
            return false;
          }
        }
      }

      console.log(
        `\n✅ Migration complete: ${successful} successful, ${failed} failed`,
      );
      return failed === 0;
    } catch (error) {
      console.error('❌ Migration error:', (error as Error).message);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<MigrationHistory[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<MigrationHistory>(
        'SELECT id, filename, executed_at, status FROM _migrations ORDER BY executed_at DESC',
      );
      return result.rows;
    } catch (error) {
      console.error('Error reading migration history:', (error as Error).message);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Rollback last migration (marks as rolled_back)
   */
  async rollback(): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT filename FROM _migrations WHERE status = $1 ORDER BY executed_at DESC LIMIT 1',
        ['completed'],
      );

      if (result.rows.length === 0) {
        console.log('ℹ️  No migrations to rollback');
        return true;
      }

      const filename = result.rows[0].filename;
      console.log(`🔄 Marking as rolled back: ${filename}`);

      await client.query('UPDATE _migrations SET status = $1 WHERE filename = $2', [
        'rolled_back',
        filename,
      ]);

      console.log(`✅ Migration marked as rolled back`);
      return true;
    } catch (error) {
      console.error('Rollback error:', (error as Error).message);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get migration files
   */
  private getMigrationFiles(): string[] {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.warn(`⚠️  Migrations directory not found:${migrationsDir}`);
      return [];
    }

    return fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => path.join(migrationsDir, file));
  }
}

/**
 * Create connection from environment variables
 */
export function createDatabaseConnection(): DatabaseConnection {
  const config: DatabaseConfig = {
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || '123456',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433'),
    database: process.env.DATABASE_NAME || 'mydatabase',
  };

  return new DatabaseConnection(config);
}

/**
 * Create singleton connection instance
 */
let dbInstance: DatabaseConnection | null = null;

export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = createDatabaseConnection();
  }
  return dbInstance;
}
