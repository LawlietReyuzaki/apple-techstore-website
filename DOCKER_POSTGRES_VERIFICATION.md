# Docker PostgreSQL Setup - Verification Guide

Complete checklist to verify your Docker PostgreSQL setup is working correctly.

## ✅ Pre-Setup Requirements

- [ ] Docker Desktop installed and running
  ```bash
  docker --version
  docker-compose --version
  ```

- [ ] Node.js v16+ installed
  ```bash
  node --version
  npm --version
  ```

---

## 🚀 Step 1: Install Dependencies (2 minutes)

```bash
npm install
```

**Verify:**
```bash
npm list pg
```

Expected: Should show `pg@latest` installed

---

## 🐳 Step 2: Start Docker PostgreSQL (2 minutes)

### Windows:
```bash
db-migrate.bat docker-up
```

### macOS/Linux with Makefile:
```bash
make docker-up
```

### macOS/Linux with script:
```bash
./db-migrate.sh docker-up
```

### Or any platform:
```bash
docker-compose up -d
```

---

## ✓ Step 3: Verify Containers Running

### Check Container Status
```bash
docker-compose ps
```

**Expected Output:**
```
NAME                    STATUS              PORTS
mydatabase_postgres     Up (healthy)        0.0.0.0:5433->5432/tcp
mydatabase_pgadmin      Up                  0.0.0.0:5050->80/tcp
```

**Wait for `(healthy)` status on PostgreSQL** - This takes ~10 seconds

### Check Container Logs
```bash
docker-compose logs postgres
```

**Expected to see:**
```
database system is ready to accept connections
```

---

## 📡 Step 4: Test Database Connection

### Method 1: Using Migration Tool

```bash
node db-migrate.js test
```

**Expected Output:**
```
✅ Database connection successful!
Current time: 2026-02-18T12:34:56.789Z
```

### Method 2: Using Docker psql

```bash
docker-compose exec postgres psql -U admin -d mydatabase -c "SELECT 1"
```

**Expected Output:**
```
 ?column?
----------
        1
(1 row)
```

### Method 3: Check PostgreSQL Version

```bash
docker-compose exec postgres psql -U admin -d mydatabase -c "SELECT VERSION()"
```

**Expected Output:**
```
PostgreSQL 15.x on ...
```

---

## 🗃️ Step 5: Verify Migrations

### Run All Migrations
```bash
node db-migrate.js migrate
```

**Expected Output:**
```
🔄 Found 52 migration files

✅ Executed: 20251019194355_2ad0b62c...sql
✅ Executed: 20251019195549_03814082...sql
... (more migrations)

✅ Migration complete: 52 successful, 0 failed
```

### View Migration History
```bash
node db-migrate.js history
```

**Expected Output:**
```
📋 Migration History:

filename                                  executed_at              status
────────────────────────────────────────  ───────────────────────  ──────────
20251230071728_d26a75bf-d1f8...sql       2026-02-18 12:34:56      completed
20251229014518_ff3830e6-03e7...sql       2026-02-18 12:34:55      completed  
... (all migrations)
```

---

## 🌐 Step 6: Verify pgAdmin UI

### Access pgAdmin
1. Open browser: http://localhost:5050
2. **Email:** admin@example.com
3. **Password:** admin

### Add PostgreSQL Server to pgAdmin
1. Click "Add New Server"
2. **Name:** `PostgreSQL` (or any name)
3. Go to "Connection" tab:
   - **Host:** `postgres` (Docker internal DNS)
   - **Port:** `5432` (Docker internal port, NOT 5433)
   - **Database:** `mydatabase`
   - **Username:** `admin`
   - **Password:** `123456`
4. Click "Save"

**If successful:** Server appears in left sidebar and shows green indicator

---

## 💾 Step 7: Verify Data Persistence

### Create Test Data
```bash
docker-compose exec postgres psql -U admin -d mydatabase << EOF
CREATE TABLE test_persistence (
  id SERIAL PRIMARY KEY,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_persistence (message) VALUES ('Test data');
SELECT * FROM test_persistence;
EOF
```

**Expected Output:**
```
id │ message   │ created_at
───┼───────────┼──────────────────
 1 │ Test data │ 2026-02-18 12:34:56
```

### Stop Docker and Verify Data Persists
```bash
docker-compose down
```

### Restart Docker
```bash
docker-compose up -d
```

### Check Data Still Exists
```bash
docker-compose exec postgres psql -U admin -d mydatabase -c "SELECT * FROM test_persistence"
```

**Expected:** Data is still there! ✅

---

## 🔗 Step 8: Verify Database URL/Connection String

### Test Connection String in Code

Create a test file `test-connection.js`:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://admin:123456@localhost:5433/mydatabase'
});

(async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful!', result.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await pool.end();
  }
})();
```

Run it:
```bash
node test-connection.js
```

**Expected Output:**
```
✅ Connection successful! { now: 2026-02-18T12:34:56.789Z }
```

---

## 🔐 Step 9: Verify Environment Variables

### Check `.env` File
```bash
cat .env
```

**Verify these exist:**
```env
DATABASE_URL=postgresql://admin:123456@localhost:5433/mydatabase
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=mydatabase
DATABASE_USER=admin
DATABASE_PASSWORD=123456
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
NODE_ENV=development
PORT=3000
```

### Check Node.js Can Read Env
```bash
node -e "console.log(process.env.DATABASE_URL)"
```

**Expected:** Should print your connection string

---

## 📊 Step 10: Verify Database Objects

### List All Tables
```bash
docker-compose exec postgres psql -U admin -d mydatabase -c "\dt"
```

**Expected:** Should list tables from your migrations

### Check Extensions
```bash
docker-compose exec postgres psql -U admin -d mydatabase -c "\dx"
```

**Expected:** Should show:
- uuid-ossp
- pgcrypto
- pg_trgm
- Other installed extensions

### Check Schema
```bash
docker-compose exec postgres psql -U admin -d mydatabase -c "\dn"
```

**Expected:** Should list schemas (including `public`)

---

## 🔧 Step 11: Verify Helper Scripts

### Windows Users
```bash
db-migrate.bat docker-ps
db-migrate.bat test
db-migrate.bat history
```

All commands should work without errors.

### macOS/Linux Users
```bash
chmod +x db-migrate.sh  # Make executable if needed
./db-migrate.sh docker-ps
./db-migrate.sh test
./db-migrate.sh history
```

All commands should work without errors.

### Makefile Users (macOS/Linux)
```bash
make status
make test
make history
```

All commands should work without errors.

---

## 🧪 Step 12: Run Full Integration Test

### Create Comprehensive Test Script

Save as `full-test.js`:

```javascript
const { createDatabaseConnection } = require('./src/lib/database.js');

(async () => {
  console.log('🚀 Starting full integration test...\n');

  const db = createDatabaseConnection();

  try {
    // 1. Test connection
    console.log('1️⃣  Testing connection...');
    const connected = await db.testConnection();
    if (!connected) throw new Error('Connection failed');
    console.log('   ✅ Connected\n');

    // 2. Get database info
    console.log('2️⃣  Getting database info...');
    const info = await db.getDatabaseInfo();
    if (!info) throw new Error('Could not get database info');
    console.log(`   ✅ Database: ${info.database}`);
    console.log(`   ✅ User: ${info.user}`);
    console.log(`   ✅ Version: ${info.version?.split('on')[0]?.trim()}\n`);

    // 3. Get migration history
    console.log('3️⃣  Getting migration history...');
    const history = await db.getMigrationHistory();
    console.log(`   ✅ ${history.length} migrations executed\n`);

    // 4. Run a test query
    console.log('4️⃣  Running test query...');
    const result = await db.query('SELECT 1 as test');
    console.log(`   ✅ Test query passed\n`);

    console.log('✅ All tests passed! Database is fully functional.\n');

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);

  } finally {
    await db.close();
  }
})();
```

Run it:
```bash
node full-test.js
```

**Expected Output:**
```
🚀 Starting full integration test...

1️⃣  Testing connection...
   ✅ Connected

2️⃣  Getting database info...
   ✅ Database: mydatabase
   ✅ User: admin
   ✅ Version: PostgreSQL 15.x

3️⃣  Getting migration history...
   ✅ 52 migrations executed

4️⃣  Running test query...
   ✅ Test query passed

✅ All tests passed! Database is fully functional.
```

---

## 📋 Complete Verification Checklist

- [ ] Docker Desktop running
- [ ] Node.js v16+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Docker containers running (`docker-compose ps`)
- [ ] PostgreSQL marked as "healthy"
- [ ] Database connection works (`node db-migrate.js test`)
- [ ] All migrations executed (`node db-migrate.js history`)
- [ ] pgAdmin accessible (http://localhost:5050)
- [ ] pgAdmin can connect to PostgreSQL
- [ ] Can create and query tables
- [ ] Data persists across restart
- [ ] Connection string works
- [ ] Helper scripts work (db-migrate.bat, .sh, or Makefile)
- [ ] Environment variables configured
- [ ] Full integration test passes

---

## 🎉 Success!

If all checks pass, your PostgreSQL Docker setup is **fully functional**!

### Next Steps:
1. Review [DATABASE_API_REFERENCE.md](./DATABASE_API_REFERENCE.md) to learn the API
2. Start building your application code
3. Use database utilities from `src/lib/database.ts`

### Useful Commands to Remember:
```bash
docker-compose up -d        # Start
docker-compose down         # Stop
node db-migrate.js migrate  # Run migrations
node db-migrate.js test     # Test connection
node db-migrate.js history  # View history
```

---

## 🆘 If Tests Fail

### Common Issues:

**Port 5433 in use:**
```bash
# Change port in docker-compose.yml
# Or kill process on that port
lsof -i :5433  # macOS/Linux
netstat -ano | findstr 5433  # Windows
```

**PostgreSQL not ready:**
```bash
# Wait longer, then retry
sleep 10
node db-migrate.js test
```

**Database doesn't exist:**
```bash
# Check Docker logs
docker-compose logs postgres
# Look for: CREATE DATABASE errors
```

**Permission issues:**
```bash
# macOS/Linux - make scripts executable
chmod +x db-migrate.sh init-db.sh
```

**Connection refused:**
```bash
# Verify container is running
docker-compose ps
# Check it's actually healthy
docker-compose logs postgres | grep healthy
```

---

## 📞 Need More Help?

- Full guide: [DOCKER_POSTGRES_GUIDE.md](./DOCKER_POSTGRES_GUIDE.md)
- API docs: [DATABASE_API_REFERENCE.md](./DATABASE_API_REFERENCE.md)
- Quick start: [DOCKER_POSTGRES_QUICKSTART.md](./DOCKER_POSTGRES_QUICKSTART.md)
- Summary: [DOCKER_POSTGRES_SETUP_SUMMARY.md](./DOCKER_POSTGRES_SETUP_SUMMARY.md)

