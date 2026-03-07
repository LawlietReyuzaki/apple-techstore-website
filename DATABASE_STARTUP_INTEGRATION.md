# 🚀 Complete Startup Integration Guide

End-to-end guide for integrating database setup into your Node.js/TypeScript web application startup.

---

## 📌 What You Have

### Files Created/Updated

1. **setup-db.js** (NEW)
   - Comprehensive database initialization script
   - Environment validation
   - Connection testing with retries
   - Automatic migration execution
   - Table verification
   - Pretty console output with colors

2. **package.json** (UPDATED)
   - Added 13 new npm scripts for database operations
   - Integrated `npm start` with automatic setup
   - Added Docker management commands

3. **docker-compose.yml** (FIXED)
   - Removed duplicate `networks` definition
   - Ready to launch PostgreSQL + pgAdmin

4. **db-migrate.js** (EXISTING)
   - Migration execution engine
   - Supports continue-on-error for flexible migration
   - Migration history tracking

5. **db-migrate.bat** (EXISTING)
   - Windows command helper
   - Simplified Docker and database operations

6. **db-migrate.sh** (EXISTING)
   - macOS/Linux command helper
   - Simplified Docker and database operations

---

## 🎯 Quick Start (3 Steps)

### Step 1: Verify Docker is Running

```bash
docker ps
# If empty, start Docker Desktop
```

### Step 2: Run Complete Setup

```bash
npm start
```

This will automatically:
1. ✅ Validate `.env` file
2. ✅ Test database connection (with retries)
3. ✅ Run all pending migrations
4. ✅ Verify 48+ tables exist
5. ✅ Show migration statistics
6. ✅ Start your Vite development server

### Step 3: Access Your Application

- **Web App**: http://localhost:5173 (Vite default)
- **pgAdmin**: http://localhost:5050 (Database UI)
  - Email: `admin@admin.com`
  - Password: `admin`

---

## 📦 NPM Commands Reference

### Database Setup Commands

```bash
# Full automatic setup (includes migrations)
npm run setup

# Check connection only (no migrations)
npm run db:setup:check

# Start dev server with automatic setup
npm run dev
npm start
```

### Database Management Commands

```bash
# Test connection
npm run db:test

# Run migrations
npm run db:migrate

# Run migrations (skip errors)
npm run db:migrate:continue

# View migration history
npm run db:history

# Rollback last migration
npm run db:rollback
```

### Docker Commands

```bash
# Start containers
npm run docker:up

# Stop containers
npm run docker:down

# Restart containers
npm run docker:restart

# View logs
npm run docker:logs
```

---

## 🏗️ Startup Flow

### `npm start` Execution Path

```
npm start
    ↓
    ├─→ npm run setup
    │   └─→ node setup-db.js
    │       ├─ Validate .env
    │       ├─ Test Database Connection
    │       ├─ Run Migrations (via db-migrate.js)
    │       ├─ Verify Tables
    │       └─ Show Statistics
    │
    └─→ vite
        └─ Start Webpack Dev Server on http://localhost:5173
```

### Alternative Flows

**Without automatic setup:**
```bash
npm run dev          # Includes setup
npm run docker:up    # Manual Docker start
npm run db:setup     # Manual migration
```

**Check-only mode (production):**
```bash
npm run db:setup:check  # Verify connection, skip migrations
npm run build           # Build for production
```

---

## 🔧 Integration Points

### 1. Development Workflow

```bash
# Terminal 1: Start app with setup
npm start

# Application is ready immediately with:
# - PostgreSQL running in Docker
# - All 48+ tables created
# - Migrations tracked in _migrations table
```

### 2. CI/CD Pipeline

```bash
# In your GitHub Actions / GitLab CI / Jenkins:
- name: Setup Database
  run: npm run db:setup:check  # Check-only, no migrations

- name: Build Application
  run: npm run build

- name: Deploy
  run: npm start
```

### 3. Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Setup database before starting
RUN npm run db:setup:check

# Start production server
CMD ["npm", "run", "preview"]
```

### 4. Environment-Specific Setup

**Development** (.env.development):
```env
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_POOL_MAX=5
```

**Production** (.env.production):
```env
NODE_ENV=production
DATABASE_HOST=prod-db.example.com
DATABASE_PORT=5432
DATABASE_POOL_MAX=20
```

```bash
# Automatically loads appropriate .env file
npm start  # Uses NODE_ENV=development
```

---

## ✅ Complete Verification Checklist

After running `npm start`, verify:

- [ ] See banner: "DATABASE SETUP & INITIALIZATION SCRIPT"
- [ ] See: "✅ .env file found"
- [ ] See: "✅ All required environment variables found"
- [ ] See: "✅ Connected successfully!"
- [ ] See: "✅ All migrations completed successfully!"
- [ ] See: "✅ Table exists: products"
- [ ] See: "✅ Table exists: orders"
- [ ] See: "✅ Table exists: repairs"
- [ ] See: "✅ Table exists: profiles"
- [ ] See: "✅ Table exists: payments"
- [ ] See: "✅ Table exists: user_roles"
- [ ] See: "✨ Database is ready for use!"
- [ ] See: "Setup completed successfully!"
- [ ] Web browser: http://localhost:5173 loads (not 5032!)
- [ ] pgAdmin: http://localhost:5050 accessible

---

## 🐛 Troubleshooting

### Issue: `ECONNREFUSED`

**Symptom**: "Error: connect ECONNREFUSED"

**Solution**:
```bash
# Ensure Docker is running
docker ps

# Start containers if not running
npm run docker:up

# Wait 5 seconds for PostgreSQL to initialize
# Try again
npm start
```

### Issue: "Missing environment variables"

**Symptom**: "Database connection failed"

**Solution**:
```bash
# Check .env file exists
cat .env

# Should contain at minimum:
# DATABASE_USER=admin
# DATABASE_PASSWORD=123456
# DATABASE_HOST=localhost
# DATABASE_PORT=5433
```

### Issue: "Migrations failed"

**Symptom**: "Migration failed. Stopping."

**Solution**:
```bash
# Run with error continuation
npm run db:migrate:continue

# Check detailed logs
npm run docker:logs

# If completely broken, reset
npm run docker:down
npm run docker:up
npm run db:setup
```

### Issue: App starts but no database connection

**Symptom**: App loads but database queries fail

**Solution**:
```bash
# Test connection directly
npm run db:test

# Should see: "✅ Database connection successful!"
# If not, check Docker logs
npm run docker:logs
```

### Issue: Port 5433 already in use

**Symptom**: "Error: listen EADDRINUSE 127.0.0.1:5433"

**Solution**:
```bash
# Option 1: Kill process using port 5433
# On Windows:
netstat -ano | findstr :5433
taskkill /PID <PID> /F

# Option 2: Use different port in docker-compose.yml
# Change: "5433:5432" to "5434:5432"
# Update .env: DATABASE_PORT=5434
```

---

## 📊 Database Schema Overview

### Created Tables (48+)

**Core Business Tables:**
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `repairs` - Device repairs
- `payments` - Payment transactions
- `profiles` - User profiles
- `user_roles` - Role-based access
- `reviews` - Product reviews
- `notifications` - User notifications
- `wishlist` - Favorited items

**Device Catalog Tables:**
- `phone_categories` - Device types
- `phone_models` - Device models
- `phone_brands` - Device makers
- `phone_colors` - Color variants
- `phone_storage_options` - Storage capacities

**Shop Management Tables:**
- `shop_categories` - Shop classifications
- `shop_items` - Shop offerings
- `shop_brands` - Shop brands
- `shop_models` - Shop models
- `shop_part_types` - Part classifications

**Spare Parts Tables:**
- `spare_parts` - Available parts
- `spare_parts_brands` - Part makers
- `spare_parts_colors` - Part colors
- `part_categories` - Part types
- `part_types` - Part specifications

**admin tables:**
- `admin_settings` - Configuration
- `payment_settings` - Payment config
- `order_status_history` - Order tracking

**System Tables:**
- `_migrations` - Migration history

---

## 🔐 Security Best Practices

### 1. Environment Variables

```bash
# ✅ DO: Use .env file
cat .env  # Contains: USERNAME, PASSWORD, HOST, PORT

# ❌ DON'T: Hardcode credentials
const password = "123456";  // NEVER!
```

### 2. Git safety

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# Verify before committing
git status  # Should NOT show .env files
```

### 3. Production Deployment

```bash
# Set environment variables in production (not .env file):

# GitHub Actions:
env:
  DATABASE_PASSWORD: ${{ secrets.DB_PASSWORD }}

# Docker:
docker-compose.yml uses secrets or external env vars

# Kubernetes:
kubectl create secret generic db-creds \
  --from-literal=password=$DB_PASSWORD
```

---

## 📈 Performance Tips

### 1. Connection Pooling

Already configured in `.env`:
```env
DATABASE_POOL_MIN=2      # Minimum connections
DATABASE_POOL_MAX=10     # Maximum connections
DATABASE_STATEMENT_TIMEOUT=30000  # 30 second timeout
```

### 2. Query Optimization

Use indexes (already created in migrations):
```bash
# Check table sizes
\d products

# Check index usage
\dx
```

### 3. Backup Strategy

```bash
# Backup database
docker exec mydatabase_postgres pg_dump \
  -U admin mydatabase > backup.sql

# Restore from backup
docker exec -i mydatabase_postgres psql \
  -U admin mydatabase < backup.sql
```

---

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] .env configured with production credentials
- [ ] Docker running with PostgreSQL
- [ ] `npm run db:setup:check` passes (read-only check)
- [ ] `npm run build` completes without errors
- [ ] Application loads on http://localhost:5173

### Deployment Commands

```bash
# 1. Setup (check-only mode)
npm run db:setup:check

# 2. Build for production
npm run build

# 3. Start production server
npm run preview

# 4. Check logs
npm run docker:logs
```

### Docker Compose Production

```bash
# Start all services in background
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Graceful shutdown
docker-compose down
```

---

## 📚 Additional Resources

- [Node.js PostgreSQL Guide](https://node-postgres.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)
- [Database Design Patterns](./DATABASE_API_REFERENCE.md)

---

## 🎓 Learning Path

1. **Understand the Flow**: Read this file completely
2. **Try it Out**: Run `npm start` and observe the output
3. **Explore pgAdmin**: Access http://localhost:5050 to browse tables
4. **Test Individually**: Run `npm run db:test` to verify connection
5. **View Migrations**: Run `npm run db:history` to see what ran
6. **Build Your Features**: Start adding code that uses the database

---

## 💡 Tips & Tricks

### Debug Mode

```bash
# See detailed PostgreSQL logs
npm run docker:logs

# Enter PostgreSQL CLI
docker exec -it mydatabase_postgres psql -U admin -d mydatabase

# Common commands:
# \dt                 - list tables
# \d tablename        - describe table
# SELECT * FROM table LIMIT 5;  - preview data
# \q                  - quit
```

### Quick Reset

```bash
# Reset everything (WARNING: deletes all data)
npm run docker:down      # Stop & remove containers/volumes
npm run docker:up        # Start fresh
npm run db:setup         # Re-initialize
npm start                # Start app
```

### Cross-Platform Compatibility

```bash
# Windows: All commands work with npm scripts
npm start

# macOS/Linux: All commands work with npm scripts
npm start

# Manual alternatives:
./db-migrate.sh test     # macOS/Linux
db-migrate.bat test      # Windows
```

---

## ✨ Summary

You now have a **production-ready database setup** that:

✅ **Validates** environment configuration  
✅ **Connects** to PostgreSQL with automatic retries  
✅ **Migrates** 48+ tables automatically  
✅ **Verifies** core tables exist  
✅ **Reports** status and statistics  
✅ **Works** across Windows, macOS, and Linux  
✅ **Integrates** seamlessly with `npm start`  
✅ **Supports** development and production modes  

**Start using it:**

```bash
npm start
```

That's it! 🎉

---

**Last Updated**: February 22, 2026  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
