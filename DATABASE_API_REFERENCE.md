# Database Connection API Reference

Complete API documentation for using the PostgreSQL database in your application.

## 📚 Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [DatabaseConnection Class](#databaseconnection-class)
4. [Connection Methods](#connection-methods)
5. [Examples](#examples)
6. [Error Handling](#error-handling)
7. [Connection Pooling](#connection-pooling)
8. [Production Configuration](#production-configuration)

---

## 📦 Installation

### 1. Ensure PostgreSQL is Running

```bash
docker-compose up -d
```

### 2. Install pg Driver

```bash
npm install pg
npm install --save-dev @types/pg  # For TypeScript
```

### 3. Set Environment Variables

Create or update `.env`:

```env
DATABASE_URL=postgresql://admin:123456@localhost:5433/mydatabase
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=mydatabase
DATABASE_USER=admin
DATABASE_PASSWORD=123456
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

---

## 🚀 Basic Usage

### TypeScript (Recommended)

```typescript
import { createDatabaseConnection } from './src/lib/database';

// Get or create database connection
const db = createDatabaseConnection();

// Test connection
const connected = await db.testConnection();

// Execute query
const users = await db.query('SELECT * FROM users WHERE id = $1', [1]);

// Close connection
await db.close();
```

### JavaScript

```javascript
const { createDatabaseConnection } = require('./src/lib/database');

const db = createDatabaseConnection();

(async () => {
  await db.testConnection();
  const users = await db.query('SELECT * FROM users WHERE id = $1', [1]);
  await db.close();
})();
```

### Using Connection String

```typescript
import { DatabaseConnection } from './src/lib/database';

const db = new DatabaseConnection({
  user: 'admin',
  password: '123456',
  host: 'localhost',
  port: 5433,
  database: 'mydatabase'
});

await db.testConnection();
```

---

## 🔧 DatabaseConnection Class

### Constructor

```typescript
constructor(config: DatabaseConfig)
```

**Parameters:**

```typescript
interface DatabaseConfig {
  user: string;              // Database user
  password: string;          // Database password
  host: string;             // Database host
  port: number;             // Database port
  database: string;         // Database name
  max?: number;             // Max pool connections (default: 10)
  min?: number;             // Min pool connections (default: 2)
  idleTimeoutMillis?: number;        // Idle timeout in ms (default: 30000)
  connectionTimeoutMillis?: number;  // Connection timeout (default: 2000)
}
```

**Example:**

```typescript
const db = new DatabaseConnection({
  user: 'admin',
  password: '123456',
  host: 'localhost',
  port: 5433,
  database: 'mydatabase',
  max: 20,
  min: 5
});
```

---

## 📋 Connection Methods

### `async testConnection(): Promise<boolean>`

Test if database connection is working.

**Returns:** `true` if connected, `false` otherwise

**Example:**

```typescript
const isConnected = await db.testConnection();
if (isConnected) {
  console.log('✅ Database is working');
} else {
  console.log('❌ Database connection failed');
}
```

---

### `async query<T>(text: string, values?: any[]): Promise<T[]>`

Execute a SQL query and get results.

**Parameters:**
- `text`: SQL query string with placeholders ($1, $2, etc.)
- `values`: Query parameters (optional)

**Returns:** Array of typed results

**Example:**

```typescript
interface User {
  id: number;
  email: string;
  name: string;
}

// Without parameters
const users = await db.query<User>('SELECT * FROM users');

// With parameters
const user = await db.query<User>(
  'SELECT * FROM users WHERE id = $1',
  [1]
);

// Multiple parameters
const result = await db.query<User>(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  ['user@example.com', true]
);
```

---

### `async getDatabaseInfo(): Promise<{version: string; database: string; user: string} | null>`

Get database version and connection info.

**Returns:** Object with version, database name, and current user

**Example:**

```typescript
const info = await db.getDatabaseInfo();
// {
//   version: 'PostgreSQL 15.1 on x86_64...',
//   database: 'mydatabase',
//   user: 'admin'
// }
```

---

### `async migrate(options?: {continueOnError?: boolean}): Promise<boolean>`

Run all pending database migrations.

**Parameters:**
- `options.continueOnError`: Continue if migration fails (default: false)

**Returns:** `true` if successful, `false` if errors

**Example:**

```typescript
// Run all migrations
const success = await db.migrate();

// Continue even if some fail
const result = await db.migrate({ continueOnError: true });
```

---

### `async getMigrationHistory(): Promise<MigrationHistory[]>`

Get history of executed migrations.

**Returns:** Array of migration records

**Example:**

```typescript
const history = await db.getMigrationHistory();
// [
//   {
//     id: 1,
//     filename: '20251019194355_init.sql',
//     executed_at: Date,
//     status: 'completed'
//   }
// ]

history.forEach(m => {
  console.log(`${m.filename} - ${m.status}`);
});
```

---

### `async rollback(): Promise<boolean>`

Mark the last migration as rolled back.

**Returns:** `true` if successful

**Note:** Actual data rollback requires reverse migrations

**Example:**

```typescript
const success = await db.rollback();
if (success) {
  console.log('Last migration marked as rolled back');
}
```

---

### `async close(): Promise<void>`

Close all database connections.

**Important:** Always call this when done

**Example:**

```typescript
try {
  const users = await db.query('SELECT * FROM users');
  console.log(users);
} finally {
  await db.close();
}
```

---

## 💡 Examples

### Complete Application Example

```typescript
import { createDatabaseConnection, DatabaseConnection } from './src/lib/database';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface order {
  id: number;
  user_id: number;
  total: number;
  created_at: Date;
}

async function main() {
  const db = createDatabaseConnection();

  try {
    // Test connection
    console.log('Testing connection...');
    const connected = await db.testConnection();
    if (!connected) {
      process.exit(1);
    }

    // Get database info
    const info = await db.getDatabaseInfo();
    console.log('Connected to:', info?.database);

    // Fetch products
    const products = await db.query<Product>(
      'SELECT * FROM products WHERE stock > $1 LIMIT $2',
      [0, 10]
    );
    console.log('Available products:', products.length);

    // Fetch orders by user
    const userId = 1;
    const orders = await db.query<Order>(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    console.log('User orders:', orders.length);

    // Insert new product
    const newProduct = await db.query<Product>(
      `INSERT INTO products (name, price, stock) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, price, stock`,
      ['New Product', 99.99, 100]
    );
    console.log('Created product:', newProduct[0]);

  } catch (error) {
    console.error('Application error:', error);
  } finally {
    await db.close();
  }
}

main();
```

### Query with Transactions

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function transferFunds(fromUser: number, toUser: number, amount: number) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Deduct from source user
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
      [amount, fromUser]
    );

    // Add to target user
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, toUser]
    );

    // Record transaction
    await client.query(
      'INSERT INTO transactions (from_user, to_user, amount) VALUES ($1, $2, $3)',
      [fromUser, toUser, amount]
    );

    await client.query('COMMIT');
    console.log('✅ Transfer successful');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transfer failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
```

---

## ⚠️ Error Handling

### Basic Error Handling

```typescript
import { createDatabaseConnection } from './src/lib/database';

const db = createDatabaseConnection();

try {
  const user = await db.query(
    'SELECT * FROM users WHERE id = $1',
    [999]
  );
  console.log('User:', user);
} catch (error) {
  if (error instanceof Error) {
    console.error('Query failed:', error.message);
  }
} finally {
  await db.close();
}
```

### Specific Error Types

```typescript
async function queryWithErrorHandling() {
  const db = createDatabaseConnection();

  try {
    const result = await db.query('SELECT * FROM nonexistent_table');
  } catch (error: any) {
    switch (error.code) {
      case '42P01':  // undefined_table
        console.error('Table does not exist');
        break;
      case '42703':  // undefined_column
        console.error('Column does not exist');
        break;
      case 'ECONNREFUSED':
        console.error('Database connection refused');
        break;
      default:
        console.error('Database error:', error.message);
    }
  } finally {
    await db.close();
  }
}
```

---

## 🔄 Connection Pooling

### Default Pool Settings

```env
DATABASE_POOL_MIN=2        # Minimum 2 idle connections
DATABASE_POOL_MAX=10       # Maximum 10 total connections
```

### Custom Pool Configuration

```typescript
const db = new DatabaseConnection({
  user: 'admin',
  password: '123456',
  host: 'localhost',
  port: 5433,
  database: 'mydatabase',
  min: 5,                    // Min connections
  max: 20,                   // Max connections
  idleTimeoutMillis: 30000,  // 30 seconds idle timeout
  connectionTimeoutMillis: 5000  // 5 seconds connect timeout
});
```

### Connection Pool Monitoring

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Monitor pool
console.log('Total connections:', pool.totalCount);
console.log('Idle connections:', pool.idleCount);
console.log('Waiting requests:', pool.waitingCount);

// Handle errors
pool.on('error', (error) => {
  console.error('Unexpected error in pool:', error);
});

pool.on('connect', () => {
  console.log('New connection established');
});
```

---

## 🏭 Production Configuration

### Environment Variables

```env
# Production database
DATABASE_URL=postgresql://prod_user:strong_password@prod-host:5432/prod_database
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
DATABASE_STATEMENT_TIMEOUT=60000
NODE_ENV=production
```

### SSL/TLS Connection

```typescript
import { Pool } from 'pg';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem', 'utf8'),
    key: fs.readFileSync('/path/to/client-key.pem', 'utf8'),
    cert: fs.readFileSync('/path/to/client-cert.pem', 'utf8')
  }
});
```

### Connection Retry Strategy

```typescript
async function connectWithRetry(maxAttempts = 5) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const db = createDatabaseConnection();
      const connected = await db.testConnection();
      if (connected) return db;
    } catch (error) {
      attempt++;
      const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Failed to connect to database after multiple attempts');
}
```

---

## 📖 API Summary

| Method | Purpose | Returns |
|--------|---------|---------|
| `testConnection()` | Test DB connectivity | `boolean` |
| `query<T>()` | Execute SQL query | `T[]` |
| `getDatabaseInfo()` | Get DB version info | `{version, database, user}` |
| `migrate()` | Run pending migrations | `boolean` |
| `getMigrationHistory()` | View migration log | `MigrationHistory[]` |
| `rollback()` | Mark migration as rolled back | `boolean` |
| `close()` | Close all connections | `void` |

