# 🚀 Database Setup & Migration Guide

Complete guide for database initialization, migrations, and integration with your Node.js/TypeScript web application.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Setup Scripts](#setup-scripts)
3. [NPM Commands](#npm-commands)
4. [Docker Management](#docker-management)
5. [Integration with Web App](#integration-with-web-app)
6. [Troubleshooting](#troubleshooting)
7. [Architecture](#architecture)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm installed
- Docker Desktop running
- PostgreSQL 15 (via Docker)
- `.env` file configured with database credentials

### One-Command Setup

```bash
# Start everything: Docker + Database + Migrations
npm run setup

# Then start your web app
npm run dev
```

Or combine them:

```bash
# Setup + Start in one command
npm start
```

---

## 📦 Setup Scripts

### 1. **setup-db.js** - Main Database Setup Script

Comprehensive setup that:
- ✅ Validates environment variables
- ✅ Tests database connection (with retries)
- ✅ Runs all pending migrations
- ✅ Verifies core tables exist
- ✅ Shows migration statistics
- ✅ Provides colored console output

**Usage:**

```bash
# Full setup
node setup-db.js

# Check connection only (no migrations)
node setup-db.js --check-only
```

**Output Examples:**

```
✅ Database connection successful!
✅ All migrations completed successfully!
✅ Table exists: products
✅ Table exists: orders
✅ Table exists: profiles
✅ Migration Statistics: 48 migrations executed
✨ Database is ready for use!
```

### 2. **db-migrate.js** - Migration Engine

Low-level migration runner with individual commands.

**Direct Usage:**

```bash
# Test connection
node db-migrate.js test

# Run migrations (stop on first error)
node db-migrate.js migrate

# Run migrations (skip errors)
node db-migrate.js migrate --continue-on-error

# Show migration history
node db-migrate.js history

# Rollback last migration
node db-migrate.js rollback
```

### 3. **db-migrate.bat** - Windows Helper (Optional)

Simplified wrapper for Windows users.

```cmd
# Test connection
db-migrate.bat test

# Run migrations
db-migrate.bat migrate

# Start Docker
db-migrate.bat docker-up

# View Docker logs
db-migrate.bat docker-logs
```

### 4. **db-migrate.sh** - macOS/Linux Helper (Optional)

Simplified wrapper for Unix systems.

```bash
# Test connection
./db-migrate.sh test

# Run migrations
./db-migrate.sh migrate

# Start Docker
./db-migrate.sh docker-up

# View Docker logs
./db-migrate.sh docker-logs
```

---

## 🔧 NPM Commands

All npm scripts are defined in `package.json`:

### Database Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `npm run db:setup` | Full database setup with migrations | `npm run db:setup` |
| `npm run db:setup:check` | Check connection without running migrations | `npm run db:setup:check` |
| `npm run db:test` | Test database connection only | `npm run db:test` |
| `npm run db:migrate` | Run pending migrations (stop on error) | `npm run db:migrate` |
| `npm run db:migrate:continue` | Run migrations (skip errors) | `npm run db:migrate:continue` |
| `npm run db:history` | Show migration execution history | `npm run db:history` |
| `npm run db:rollback` | Mark last migration as rolled back | `npm run db:rollback` |

### Application Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `npm run setup` | Initialize database | `npm run setup` |
| `npm start` | Setup + Start dev server | `npm start` |
| `npm run dev` | Setup + Start Vite dev server | `npm run dev` |
| `npm run start:prod` | Check database (production mode) | `npm run start:prod` |
| `npm run build` | Build for production | `npm run build` |

### Docker Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `npm run docker:up` | Start Docker containers | `npm run docker:up` |
| `npm run docker:down` | Stop Docker containers | `npm run docker:down` |
| `npm run docker:restart` | Restart Docker containers | `npm run docker:restart` |
| `npm run docker:logs` | View PostgreSQL logs | `npm run docker:logs` |

---

## 🐳 Docker Management

### Start Containers

```bash
# Via npm
npm run docker:up

# Via docker-compose
docker-compose up -d

# Via batch file (Windows)
db-migrate.bat docker-up

# Via shell script (macOS/Linux)
./db-migrate.sh docker-up
```

### Check Container Status

```bash
# Via docker
docker ps

# Via npm
npm run docker:logs

# Via script
db-migrate.bat docker-ps    # Windows
./db-migrate.sh docker-ps   # macOS/Linux
```

### Stop Containers

```bash
# Via npm
npm run docker:down

# Via docker-compose
docker-compose down

# Via batch file (Windows)
db-migrate.bat docker-down
```

### View Logs

```bash
# PostgreSQL logs only
npm run docker:logs

# All services
docker-compose logs -f
```

---

## 🔗 Integration with Web App

### Option 1: Automatic Setup on App Start (Recommended)

The setup script automatically runs before your app starts:

```bash
npm start
```

This executes:
1. `npm run setup` → Database initialization
2. `vite` → Start development server

**How it works in package.json:**

```json
{
  "scripts": {
    "setup": "npm run db:setup",
    "dev": "npm run setup && vite",
    "start": "npm run setup && vite"
  }
}
```

### Option 2: Manual Setup

If you prefer manual control:

```bash
# Terminal 1: Start Docker
npm run docker:up

# Terminal 2: Setup database
npm run db:setup

# Terminal 3: Start app
npm run dev
```

### Option 3: Conditional Setup (Skip if Already Initialized)

```bash
# Check connection without running migrations
npm run db:setup:check

# Then start app
npm run dev
```

### Option 4: Production Deployment

For production deployment:

```bash
# Check database is accessible (no migrations)
npm run start:prod

# Then start your production server
npm run build
npm run preview
```

---

## 📋 Environment Setup

### Required .env Variables

Create `.env` file in project root:

```env
# PostgreSQL Database Configuration (Docker)
POSTGRES_USER=admin
POSTGRES_PASSWORD=123456
POSTGRES_DB=mydatabase
POSTGRES_PORT=5433

# PostgreSQL Connection
DATABASE_URL=postgresql://admin:123456@localhost:5433/mydatabase
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=mydatabase
DATABASE_USER=admin
DATABASE_PASSWORD=123456

# Connection pool settings
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_STATEMENT_TIMEOUT=30000

# pgAdmin Configuration
PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=admin

# Node environment
NODE_ENV=development
```

### Optional: .env.local for Local Overrides

Create `.env.local` for local-only overrides (not tracked in git):

```env
DATABASE_HOST=localhost
DATABASE_PORT=5433
```

---

## 🏗️ Architecture

### Setup Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User runs: npm start                                    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ Package.json: "start": "npm run setup && vite"          │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ setup-db.js starts execution                            │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ 1. Validate .env   │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 2. Test Connection │ ←─ Retries 5 times if needed
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 3. Run Migrations  │ ←─ All 55 migration files
    │    via db-migrate  │    (continue on error)
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 4. Verify Tables   │ ←─ Check 8 core tables exist
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 5. Show Statistics │ ←─ Display migration history
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Setup Complete ✅  │
    └────────┬───────────┘
             │
             ▼
       ┌──────────────┐
       │ Start Vite   │
       │ (dev server) │
       └──────────────┘
```

### Database Initialization Sequence

```
Docker Container (PostgreSQL 15)
        ↓
   init-db.sh (extensions: UUID, pgcrypto, pg_trgm)
        ↓
   supabase/migrations/ (55 SQL files)
        ↓
   _migrations table (tracks executed migrations)
        ↓
   48 tables created:
   - products, orders, repairs, profiles, payments
   - reviews, notifications, wishlist
   - phone_categories, phone_models, phone_brands
   - shop_categories, shop_items, shop_brands
   - And 35+ more...
        ↓
   Application Ready ✅
```

### File Structure

```
project-root/
├── .env                      # Database credentials
├── package.json              # Scripts & dependencies
├── docker-compose.yml        # Docker services
├── setup-db.js              # Main setup script (NEW)
├── db-migrate.js            # Migration engine
├── db-migrate.bat           # Windows helper
├── db-migrate.sh            # Unix helper
├── init-db.sh               # Docker initialization
└── supabase/
    └── migrations/          # 55 SQL migration files
        ├── 20251019000000_create_auth_schema.sql
        ├── 20251019194355_2ad0b62c-a036...sql
        ├── ...
        └── 20251230071728_d26a75bf-d1f8...sql
```

---

## 🔍 Troubleshooting

### Issue: "Cannot connect to database"

**Cause:** Docker containers not running or database not ready

**Solution:**

```bash
# Check if Docker is running
docker ps

# Start containers
npm run docker:up

# Wait 5 seconds, then test
npm run db:test
```

### Issue: "Missing environment variables"

**Cause:** .env file missing or incomplete

**Solution:**

```bash
# Check .env file exists
cat .env

# Should contain:
# POSTGRES_USER=
# POSTGRES_PASSWORD=
# DATABASE_HOST=
# DATABASE_PORT=
```

### Issue: "Migrations failed"

**Cause:** Schema or table dependencies not met

**Solution:**

```bash
# View detailed migration history
npm run db:history

# Run migrations with error continuation
npm run db:migrate:continue

# Check logs
npm run docker:logs
```

### Issue: "auth.users does not exist"

**Cause:** Auth schema migration didn't execute

**Solution:**

```bash
# Manually create auth schema
npm run db:migrate

# Verify table exists
npm run db:test
```

### Issue: "role authenticated does not exist"

**Cause:** PostgreSQL roles not created

**Solution:**

The setup-db.js creates these automatically. If missing:

```bash
# Reset and re-run setup
npm run docker:down
npm run docker:up
sleep 5
npm run db:setup
```

---

## 📊 Monitoring

### Check Migration Status

```bash
# View executed migrations
npm run db:history

# Output shows:
# - Filename
# - Execution timestamp
# - Status (completed/rolled_back)
```

### Monitor PostgreSQL

```bash
# View real-time logs
npm run docker:logs

# Connect to psql
docker exec -it mydatabase_postgres psql -U admin -d mydatabase

# List tables
\dt

# Show database size
\l
```

### Access pgAdmin UI

```
URL: http://localhost:5050
Email: admin@admin.com
Password: admin
```

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Database connection successful
- [ ] 48+ migrations executed
- [ ] Core tables created (products, orders, repairs, etc.)
- [ ] Migration history shown
- [ ] pgAdmin accessible at http://localhost:5050
- [ ] Docker containers running (`docker ps`)
- [ ] Web app starts without errors

---

## 🚀 Next Steps

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Access pgAdmin:**
   - URL: http://localhost:5050
   - Email: admin@admin.com
   - Password: admin

3. **Insert test data:**
   ```sql
   INSERT INTO products (name, description) 
   VALUES ('Test Product', 'Test Description');
   ```

4. **Deploy to production:**
   ```bash
   npm run build
   npm run start:prod
   ```

---

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Migration Best Practices](./DATABASE_API_REFERENCE.md)
- [Database API Reference](./DATABASE_API_REFERENCE.md)

---

## 💡 Tips & Best Practices

1. **Always backup before major changes:**
   ```bash
   docker-compose down -v  # Remove volumes
   ```

2. **Run setup before development:**
   ```bash
   npm start  # Includes setup
   ```

3. **Check logs when migrations fail:**
   ```bash
   npm run docker:logs
   ```

4. **Keep .env file secure:**
   - Add `.env` to `.gitignore`
   - Never commit credentials

5. **For fresh setup:**
   ```bash
   npm run docker:down      # Stop & remove
   npm run docker:up        # Start fresh
   npm run db:setup         # Initialize
   ```

---

**Last Updated:** February 22, 2026
**Version:** 2.0.0
**Status:** Production Ready ✅
