# 🎯 DATABASE SETUP - QUICK REFERENCE CARD

## 🚀 One Command Start

```bash
npm start
```

That's it! This will:
1. Validate environment variables
2. Test database connection (with retries)
3. Run all pending migrations
4. Verify tables exist
5. Start your web app

---

## 📋 Essential Commands

### Setup & Start

| Command | What it does |
|---------|-------------|
| `npm start` | **Setup + Start app** ✅ Use this to start! |
| `npm run setup` | Setup database only |
| `npm run dev` | Setup + Start Vite dev server |

### Database Operations

| Command | What it does |
|---------|-------------|
| `npm run db:test` | Test database connection |
| `npm run db:migrate` | Run migrations |
| `npm run db:history` | Show what migrated |
| `npm run docker:up` | Start PostgreSQL server |
| `npm run docker:down` | Stop PostgreSQL server |

### Access Points

| URL | Purpose | Login |
|-----|---------|-------|
| http://localhost:5173 | Your web app | (your app) |
| http://localhost:5050 | pgAdmin (database UI) | admin@admin.com / admin |

---

## ✅ Verification

After `npm start`, you should see in the console:

```
✅ .env file found
✅ All required environment variables found
✅ Connected successfully!
✅ All migrations completed successfully!
✅ Table exists: products
✅ Table exists: orders
✅ Table exists: profiles
✅ Table exists: repairs
✅ Table exists: payments
✅ Table exists: user_roles
✨ Database is ready for use!
Setup completed successfully!
```

---

## 🔧 Prerequisites

1. **Docker Desktop** running (for PostgreSQL)
2. **.env file** in project root with:
   ```
   POSTGRES_USER=admin
   POSTGRES_PASSWORD=123456
   DATABASE_HOST=localhost
   DATABASE_PORT=5433
   ```

---

## ❌ Troubleshooting

### "ECONNREFUSED"
```bash
docker ps  # Check containers running
npm run docker:up  # Start containers if not running
npm start  # Try again
```

### "Missing environment variables"
```bash
cat .env  # Check .env exists and is complete
```

### "Migrations failed"
```bash
npm run db:migrate:continue  # Skip errors
npm run docker:logs  # Check detailed logs
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `setup-db.js` | Main setup script |
| `db-migrate.js` | Migration engine |
| `package.json` | npm scripts |
| `docker-compose.yml` | PostgreSQL config |
| `.env` | Environment variables |

---

## 🎓 Documentation

- **Full Setup Guide**: `DATABASE_SETUP_GUIDE.md`
- **Startup Integration**: `DATABASE_STARTUP_INTEGRATION.md`
- **Database API**: `DATABASE_API_REFERENCE.md`

---

## 💡 Pro Tips

- Always run `npm start` when starting development
- Check `npm run docker:logs` if anything goes wrong
- Access pgAdmin at http://localhost:5050 to view data
- Never commit `.env` file (it's in .gitignore)

---

## 🚀 Quick Cheat Sheet

```bash
# Start everything
npm start

# Check database status
npm run db:test

# View all migrations
npm run db:history

# View database UI
# Visit: http://localhost:5050

# Stop everything
npm run docker:down

# Reset & start fresh
npm run docker:down
npm run docker:up
npm start
```

---

**Questions?** Check the full guides:
- 📖 `DATABASE_SETUP_GUIDE.md` - Detailed instructions
- 🔗 `DATABASE_STARTUP_INTEGRATION.md` - Integration patterns
- 🗄️ `DATABASE_API_REFERENCE.md` - API & Schema
