# Docker PostgreSQL Setup - Quick Start Checklist

## ⏱️ Estimated Setup Time: 5-10 minutes

### Prerequisites
- [ ] Docker Desktop installed (https://www.docker.com/products/docker-desktop)
- [ ] Node.js v16+ installed (https://nodejs.org)
- [ ] Project cloned and ready

---

## Step 1: Install Dependencies (2 minutes)

```bash
npm install
# or
yarn install
```

**What this does:**
- Installs all required Node.js packages
- In particular, installs `pg` driver needed for migrations

---

## Step 2: Start Docker PostgreSQL (2 minutes)

### For Windows Users:
```bash
# Option A: Using batch file
db-migrate.bat docker-up

# Option B: Direct command
docker-compose up -d
```

### For macOS/Linux Users:
```bash
# Option A: Using shell script
chmod +x db-migrate.sh
./db-migrate.sh docker-up

# Option B: Direct command
docker-compose up -d
```

**What this does:**
- Starts PostgreSQL 15 container on port 5433
- Creates `mydatabase` database
- Starts pgAdmin (database UI) on port 5050
- Mounts migration files directory

**Expected Output:**
```
Creating mydatabase_postgres ... done
Creating mydatabase_pgadmin  ... done
```

---

## Step 3: Verify Containers (1 minute)

```bash
docker-compose ps
```

**Expected Output:**
```
NAME                        STATUS              PORTS
mydatabase_postgres         Up (healthy)        0.0.0.0:5433->5432/tcp
mydatabase_pgadmin          Up                  0.0.0.0:5050->80/tcp
```

> ⏳ **Wait ~10 seconds** for PostgreSQL to be "healthy" before continuing

---

## Step 4: Test Database Connection (1 minute)

### For Windows:
```bash
node db-migrate.js test
```

### Expected Output:
```
✅ Database connection successful!
Current time: 2026-02-18T12:34:56.789Z
```

---

## Step 5: Run Migrations (2 minutes)

### For Windows:
```bash
node db-migrate.js migrate
```

### For macOS/Linux:
```bash
./db-migrate.sh migrate
```

**Expected Output:**
```
🔄 Found 52 migration files

✅ Executed: 20251019194355_2ad0b62c-a036-4fc8-b6d9-1daf57d2b60c.sql
✅ Executed: 20251019195549_03814082-e76a-457e-a97c-d638ce4529d3.sql
... (more migrations)

✅ Migration complete: 52 successful, 0 failed
```

---

## Step 6: View Migration History (Optional)

```bash
node db-migrate.js history
```

**Shows:**
- All executed migrations
- Execution timestamp
- Status (completed/rolled_back)

---

## 📁 Project Structure (What Was Created)

```
your-project/
├── docker-compose.yml          ← Docker configuration
├── init-db.sh                  ← PostgreSQL initialization
├── .env                        ← Environment variables
├── .env.example                ← Environment template
├── db-migrate.js               ← Migration tool (Node.js)
├── db-migrate.bat              ← Migration helper (Windows)
├── db-migrate.sh               ← Migration helper (macOS/Linux)
├── DOCKER_POSTGRES_GUIDE.md    ← Full documentation
└── src/lib/database.ts         ← TypeScript database utilities
```

---

## 🔑 Database Credentials

```
Host:     localhost
Port:     5433
Database: mydatabase
Username: admin
Password: 123456
```

**Connection String:**
```
postgresql://admin:123456@localhost:5433/mydatabase
```

---

## 🌐 Web Interfaces

### pgAdmin (Database Management)
- **URL:** http://localhost:5050
- **Email:** admin@example.com
- **Password:** admin

**In pgAdmin:**
1. Click "Add New Server"
2. Name: `PostgreSQL`
3. Host: `postgres` (Docker internal DNS)
4. Port: `5432` (Docker internal)
5. Username: `admin` / Password: `123456`

---

## 📝 Common Tasks

### View Database Tables
```bash
docker-compose exec postgres psql -U admin -d mydatabase -c "\dt"
```

### Access Database via psql
```bash
docker-compose exec postgres psql -U admin -d mydatabase
```

Then you can:
```sql
\dt              -- list tables
\d table_name    -- describe table
SELECT * FROM table_name LIMIT 5;  -- query data
\q               -- quit
```

### Stop PostgreSQL
```bash
docker-compose down
```

Data persists! Starting again with `docker-compose up -d` restores it.

### Reset Database Completely (⚠️ DELETES DATA)
```bash
docker-compose down -v
docker-compose up -d
node db-migrate.js migrate
```

---

## 🚨 Troubleshooting

### "Port 5433 is already in use"
```bash
# Option 1: Stop conflicting application
# Option 2: Change port in docker-compose.yml (change 5433 to another port)
```

### "Connection refused"
```bash
# Check if container is running
docker-compose ps

# Wait a bit, then try again
# First Docker startup takes ~10 seconds
sleep 10
node db-migrate.js test
```

### "psql: command not found"
```bash
# psql is only needed for advanced debugging
# All migrations work without it
```

### "Permission denied on init-db.sh"
```bash
# macOS/Linux only:
chmod +x init-db.sh

# Windows: Should work as-is with Docker
```

---

## 📋 Verification Checklist

Complete checklist after setup:

- [ ] Docker Desktop is running
- [ ] `docker-compose ps` shows 2 containers running
- [ ] `node db-migrate.js test` succeeds
- [ ] `node db-migrate.js history` shows migrations
- [ ] Can access http://localhost:5050 (pgAdmin)
- [ ] `.env` file exists with credentials
- [ ] All 52 migrations executed successfully

---

## ✅ You're All Set!

Your PostgreSQL database is now:
- ✅ Running in Docker
- ✅ Fully migrated
- ✅ Ready for development
- ✅ Backed by persistent volumes
- ✅ Accessible via UI (pgAdmin)

---

## 📚 Next Steps

1. **Configure your application** to use the database connection string:
   ```
   postgresql://admin:123456@localhost:5433/mydatabase
   ```

2. **Use the database utilities** in your TypeScript code:
   ```typescript
   import { createDatabaseConnection } from './src/lib/database';
   
   const db = createDatabaseConnection();
   const connected = await db.testConnection();
   ```

3. **For more details**, see [DOCKER_POSTGRES_GUIDE.md](./DOCKER_POSTGRES_GUIDE.md)

---

## 🆘 Still Need Help?

- Check logs: `docker-compose logs postgres`
- Read full guide: [DOCKER_POSTGRES_GUIDE.md](./DOCKER_POSTGRES_GUIDE.md)
- Test connection: `node db-migrate.js test`
- View migrations: `node db-migrate.js history`

