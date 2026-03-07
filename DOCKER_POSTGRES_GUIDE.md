# Docker PostgreSQL Setup Guide

Complete guide for setting up and managing PostgreSQL 15 with Docker for your project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Database Configuration](#database-configuration)
4. [Running Migrations](#running-migrations)
5. [Testing Connection](#testing-connection)
6. [Managing the Database](#managing-the-database)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)
9. [Connection Strings](#connection-strings)

---

## 📦 Prerequisites

Before starting, ensure you have:

- **Docker Desktop** installed and running
  - Download from: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version`

- **Docker Compose** (included with Docker Desktop)
  - Verify: `docker-compose --version`

- **Node.js** (v16+) with npm or yarn
  - Verify: `node --version`

---

## 🚀 Quick Start

### Step 1: Start the PostgreSQL Container

```bash
# Navigate to the project root directory
cd /path/to/your/project

# Start the PostgreSQL database
docker-compose up -d

# Expected output:
# Creating mydatabase_postgres ... done
# Creating mydatabase_pgadmin  ... done
```

### Step 2: Verify Container is Running

```bash
docker-compose ps

# Look for these services:
# NAME                        STATUS
# mydatabase_postgres         Up (healthy)
# mydatabase_pgadmin          Up
```

### Step 3: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 4: Run Migrations

```bash
node db-migrate.js test
# Should output: ✅ Database connection successful!

node db-migrate.js migrate
# Should run all SQL migration files
```

### Step 5: Verify Database

```bash
node db-migrate.js history
# Shows all executed migrations
```

---

## 🗄️ Database Configuration

### Default Credentials

```
Host:     localhost
Port:     5433
Database: mydatabase
Username: admin
Password: 123456
```

### Configuration Files

#### `docker-compose.yml`
- Main configuration for PostgreSQL and pgAdmin containers
- Defines ports, volumes, environment variables
- Includes health checks and auto-restart

#### `.env` and `.env.example`
- Database connection environment variables
- Connection string: `postgresql://admin:123456@localhost:5433/mydatabase`
- Pool configuration for connection management

#### Storage
- Database data persists in `postgres_data` volume
- Docker will not delete data when containers stop

---

## 🔄 Running Migrations

### Automatic Migrations (Docker Startup)

Migrations run automatically when Docker starts:
1. Container detects SQL files in `/supabase/migrations`
2. Executes them in alphabetical order (by timestamp)
3. Skips already-executed migrations

### Manual Migration Execution

```bash
# Test connection first
node db-migrate.js test

# Run all pending migrations
node db-migrate.js migrate

# Continue even if some fail
node db-migrate.js migrate --continue-on-error

# View migration history
node db-migrate.js history

# Mark last migration as rolled back
node db-migrate.js rollback
```

### Creating New Migrations

1. Create a new timestamped SQL file:
```bash
# Filename format: YYYYMMDDHHmmss_description.sql
# Example: 20260218120000_add_users_table.sql
```

2. Add your SQL:
```sql
-- Migrations: 20260218120000_add_users_table.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

3. Run migrations:
```bash
node db-migrate.js migrate
```

---

## 🧪 Testing Connection

### Quick Test

```bash
node db-migrate.js test
```

Expected output:
```
✅ Database connection successful!
Current time: 2026-02-18T12:34:56.789Z
```

### Test from Node.js Code

```javascript
import { createDatabaseConnection } from './src/lib/database.js';

const db = createDatabaseConnection();

(async () => {
  const connected = await db.testConnection();
  const info = await db.getDatabaseInfo();
  console.log(info);
  await db.close();
})();
```

### Test with psql (Command Line)

```bash
# If PostgreSQL client tools are installed

# Option 1: From your machine
psql -h localhost -p 5433 -U admin -d mydatabase

# Option 2: Inside Docker container
docker-compose exec postgres psql -U admin -d mydatabase

# Test query inside psql:
SELECT version();
\dt  -- list tables
\q  -- quit
```

---

## 🛠️ Managing the Database

### Container Management

```bash
# Start containers
docker-compose up -d

# Stop containers (data persists)
docker-compose down

# Restart containers
docker-compose restart

# View logs
docker-compose logs postgres
docker-compose logs postgres -f  # follow log output

# Stop a specific service
docker-compose stop postgres

# Remove containers and volumes (⚠️ DELETES DATA)
docker-compose down -v
```

### Database Management UI

Access pgAdmin (Web Interface):
- URL: http://localhost:5050
- Email: admin@example.com
- Password: admin

In pgAdmin:
1. Register new server
2. Host: `postgres` (internal Docker DNS)
3. Port: `5432` (internal port)
4. Username: `admin`
5. Database: `mydatabase`

---

## 🔐 Environment Variables

### Database Configuration

```env
# Connection details
DATABASE_URL=postgresql://admin:123456@localhost:5433/mydatabase
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=mydatabase
DATABASE_USER=admin
DATABASE_PASSWORD=123456

# Connection pool
DATABASE_POOL_MIN=2        # Minimum connections
DATABASE_POOL_MAX=10       # Maximum connections
DATABASE_STATEMENT_TIMEOUT=30000  # 30 seconds

# Application
NODE_ENV=development
PORT=3000
```

### Using Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Modify values as needed (for production, change defaults)

3. In your application:
```javascript
const dbUrl = process.env.DATABASE_URL;
const poolMin = process.env.DATABASE_POOL_MIN || 2;
const poolMax = process.env.DATABASE_POOL_MAX || 10;
```

---

## 📝 Connection Strings

### Standard PostgreSQL URL

```
postgresql://admin:123456@localhost:5433/mydatabase
```

#### Components:
- Protocol: `postgresql://`
- Username: `admin`
- Password: `123456`
- Host: `localhost`
- Port: `5433`
- Database: `mydatabase`

### Connection String Variations

```bash
# With SSL (production)
postgresql://admin:123456@localhost:5433/mydatabase?sslmode=require

# With parameters
postgresql://admin:123456@localhost:5433/mydatabase?application_name=myapp&statement_timeout=30000

# From inside Docker
postgresql://admin:123456@postgres:5432/mydatabase
#                                    ^     ^    ^
#                             Internal host  port  (no 5433 mapping needed)
```

### Connection in Different Environments

#### Node.js/Express
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

#### TypeScript
```typescript
import { createDatabaseConnection } from './src/lib/database';

const db = createDatabaseConnection();
```

#### Direct psql
```bash
psql postgresql://admin:123456@localhost:5433/mydatabase
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs postgres

# Common issues:
# - Port 5433 already in use
#   Solution: Change port in docker-compose.yml or stop other containers

# - Volume permissions
#   Solution: Run `docker-compose down -v` then restart
```

### Connection Refused

```bash
# Verify container is running
docker-compose ps

# Verify PostgreSQL is ready
docker-compose logs postgres | grep "database system is ready"

# Check port mapping
netstat -an | findstr 5433  # Windows
lsof -i :5433              # macOS/Linux

# Wait and retry (first startup takes time)
sleep 10
node db-migrate.js test
```

### Migration Fails

```bash
# Check migration file syntax
docker-compose exec postgres psql -U admin -d mydatabase < ./supabase/migrations/FILE_NAME.sql

# View error details
node db-migrate.js migrate

# Check existing tables
docker-compose exec postgres psql -U admin -d mydatabase -c "\dt"
```

### Permission Denied on Scripts

```bash
# Make init-db.sh executable (macOS/Linux)
chmod +x init-db.sh

# Windows: Should work as-is with Docker
```

### Database Already Exists Error

```bash
# This is normal - Docker only creates on first start

# To reset database completely:
docker-compose down -v
docker-compose up -d
```

---

## 📚 Useful Commands Reference

```bash
# Database operations
node db-migrate.js test               # Test connection
node db-migrate.js migrate            # Run migrations
node db-migrate.js history            # View migration history
node db-migrate.js rollback           # Mark last migration as rolled back

# Container management
docker-compose up -d                  # Start in background
docker-compose down                   # Stop containers
docker-compose ps                     # Show running containers
docker-compose logs -f                # View logs (follow)
docker-compose restart postgres       # Restart PostgreSQL

# Direct database access
docker-compose exec postgres psql -U admin -d mydatabase
```

---

## ✅ Verification Checklist

- [ ] Docker Desktop installed and running
- [ ] PostgreSQL container started: `docker-compose ps`
- [ ] Database accessible: `node db-migrate.js test`
- [ ] Migrations executed: `node db-migrate.js history`
- [ ] pgAdmin accessible: http://localhost:5050
- [ ] Environment variables configured: `.env` exists
- [ ] Data persists after restart: `docker-compose down && docker-compose up -d`

---

## 🔗 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/index.html)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)

---

## 📞 Need Help?

If you encounter issues:

1. Check logs: `docker-compose logs postgres`
2. Verify container health: `docker-compose ps`
3. Test connection: `node db-migrate.js test`
4. Review `.env` configuration
5. Check firewall/port conflicts

