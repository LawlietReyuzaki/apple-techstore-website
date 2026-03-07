# Step-by-Step Visual Setup Guide

## Visual Flow

```
┌─────────────────────────────────────────────────────┐
│  1. Create Supabase Project (supabase.com)          │
│     └─→ Get Project URL & API Keys                  │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│  2. Create .env.local with credentials              │
│     VITE_SUPABASE_URL=https://xxx.supabase.co       │
│     VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...            │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│  3. Install Supabase CLI                            │
│     npm install -g supabase                         │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│  4. Link Project with CLI                           │
│     supabase link --project-ref your-project-id     │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│  5. Run Migrations                                  │
│     supabase db push                                │
│     (Applies all .sql files in supabase/migrations) │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│  6. Test Connection                                 │
│     node test-supabase-connection.js                │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│  ✅ Ready to Use!                                   │
│     npm run dev                                     │
└─────────────────────────────────────────────────────┘
```

---

## Detailed Steps with Screenshots Description

### Step 1: Create Supabase Project
**URL:** https://supabase.com/dashboard

```
Supabase Dashboard
├─ New project
│  ├─ Project name: dmarket-peek-and-seek
│  ├─ Database password: ••••••••(strong password)
│  ├─ Region: us-east-1 (or closest to you)
│  └─ Create project ✓
└─ Wait 2-3 minutes...
```

### Step 2: Get Your Credentials
**URL:** Your Project → Settings → API

```
You should see:
- Project URL:       https://abcdef123456.supabase.co
- Anon Key:          eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- Service Role Key:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy these to `.env.local` file.

### Step 3: PowerShell Commands
Open PowerShell and run in order:

```powershell
# Navigate to project
cd "c:\Users\Hassan\Desktop\Dilbar website\clone\dmarket-peek-and-seek-35708193"

# Install Supabase CLI globally
npm install -g supabase

# Verify installation
supabase --version
# Output: Supabase CLI 1.x.x

# Initialize Supabase in your project
supabase init

# Link to your Supabase project
supabase link --project-ref abcdef123456
# Follow prompts to authenticate

# Push all migrations to Supabase
supabase db push
# Output: ✓ Pushed 55 migrations

# Verify migrations
supabase migration list
# Should show all migration files with status "under review"

# Test the connection
node test-supabase-connection.js
# Expected: ✅ All tests passed!
```

---

## File Structure After Setup

```
dmarket-peek-and-seek-35708193/
├─ .env.local                          ← Create this (credentials)
├─ .env.local.example                  ← Template reference
├─ test-supabase-connection.js          ← Test script (already created)
├─ SUPABASE_SETUP_GUIDE.md             ← Full documentation
├─ SUPABASE_COMMANDS.md                ← Quick commands
├─ supabase/
│  ├─ config.toml
│  └─ migrations/
│     ├─ 20251019194355_*.sql          ← Your migrations
│     ├─ 20251019195549_*.sql          │
│     └─ ... (55 total files)          ← These get applied
├─ src/
│  └─ integrations/
│     └─ supabase/
│        ├─ client.ts                  ← Already configured ✓
│        └─ types.ts                   ← Auto-generated types
└─ ...
```

---

## Testing at Each Stage

### ✓ Stage 1: Project Created
- Check Supabase dashboard loads
- Project shows "Connected" status

### ✓ Stage 2: Credentials Correct
- `.env.local` file exists
- Values match Supabase dashboard

### ✓ Stage 3: CLI Installed
```powershell
supabase --version        # Returns version number
```

### ✓ Stage 4: Project Linked
```powershell
supabase projects list    # Shows your project listed
```

### ✓ Stage 5: Migrations Applied
```powershell
supabase db push          # No errors, shows "Pushed X migrations"
supabase migration list   # All migrations show status
```

### ✓ Stage 6: Connection Works
```powershell
node test-supabase-connection.js
# Should output: ✅ All tests passed!
```

---

## Verify in Supabase Dashboard

After migration, check your database:

1. **Go to:** Project Dashboard → SQL Editor
2. **Run this query:**
```sql
SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
ORDER BY 
  table_name;
```

**Expected tables:**
- `repairs`
- `profiles`
- `user_roles`
- `sessions`
- `orders`
- etc. (based on your migrations)

3. **Test user creation:**
```sql
-- View profiles table
SELECT id, full_name, phone, role, created_at FROM profiles LIMIT 10;

-- View repairs table
SELECT id, user_id, tracking_code, status, created_at FROM repairs LIMIT 10;
```

---

## Troubleshooting Checklist

If you get errors, check these in order:

- [ ] `.env.local` file exists in project root
- [ ] `VITE_SUPABASE_URL` matches format: `https://xxx.supabase.co`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` starts with `eyJ`
- [ ] Database password is correct (from project creation)
- [ ] Supabase CLI installed: `supabase --version` works
- [ ] Project linked: `supabase projects list` shows your project
- [ ] No pending migrations: `supabase migration list`
- [ ] Network connection active (try pinging supabase.com)

---

## Next Steps After Success

1. **Start development server:**
   ```powershell
   npm run dev
   ```

2. **Test signup in application:**
   - Go to http://localhost:5173/signup
   - Create a test account
   - Check profiles table in Supabase dashboard

3. **Check authentication:**
   ```powershell
   # See users in database
   # Supabase Dashboard → Authentication → Users
   ```

4. **Monitor real-time changes:**
   - Create repair ticket in your app
   - Supabase Dashboard → Tables → repairs
   - New record should appear automatically

---

## Useful Resources

- Supabase Dashboard: https://supabase.com/dashboard
- Supabase Docs: https://supabase.com/docs
- Supabase CLI Docs: https://supabase.com/docs/guides/cli
- JavaScript Client: https://supabase.com/docs/reference/javascript

---

**Still stuck?** 
1. Check SUPABASE_SETUP_GUIDE.md for details
2. See "Troubleshooting" section
3. Review error messages carefully
4. Check Supabase status: https://status.supabase.com
