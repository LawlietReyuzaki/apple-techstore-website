# Complete Supabase Setup Guide

This guide walks you through setting up Supabase for your Dmarket Peek & Seek project and running existing SQL migrations.

---

## Step 1: Create a Supabase Project

### 1.1 Sign up / Log in to Supabase
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Sign Up"** or **"Sign In"**
3. Use GitHub, Google, or email to authenticate

### 1.2 Create a New Organization (if needed)
1. After logging in, click **"New organization"**
2. Enter organization name (e.g., "Dilbar Mobiles")
3. Click **"Create organization"**

### 1.3 Create a New Project
1. Click **"New project"** button
2. Fill in the form:
   - **Name:** `dmarket-peek-and-seek` (or your preferred name)
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Select closest to your users (e.g., `us-east-1`)
3. Click **"Create new project"**

**Wait 2-3 minutes** for the project to initialize.

---

## Step 2: Get Your Supabase Credentials

### 2.1 Access Project Settings
1. In Supabase dashboard, go to **Settings** (gear icon)
2. Click **API** in the left sidebar
3. You'll see:
   - **Project URL** (VITE_SUPABASE_URL)
   - **Anon Key** (VITE_SUPABASE_PUBLISHABLE_KEY)
   - **Service Role Key** (keep secret!)

**Copy these values** - you'll need them in Step 3.

---

## Step 3: Configure Environment Variables

### 3.1 Create `.env.local` file
In your project root (`dmarket-peek-and-seek-35708193/`), create a new file:

```
.env.local
```

### 3.2 Add Supabase Configuration
Paste the following into `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_DB_PASSWORD=your-database-password
```

**Replace:**
- `your-project-id`: Your Supabase project ID (shown in URL)
- `your-anon-key-here`: Anon Key from Step 2.1
- `your-service-role-key-here`: Service Role Key from Step 2.1
- `your-database-password`: Password you created in Step 1.3

### 3.3 Example (what it should look like):
```env
VITE_SUPABASE_URL=https://abcdef123456.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_ID=abcdef123456
SUPABASE_DB_PASSWORD=MySecurePassword123!
```

### 3.4 Update `.gitignore`
Make sure `.env.local` is NOT tracked by git:

```bash
# Add this line to .gitignore if not already present
.env.local
```

---

## Step 4: Install and Configure Supabase CLI

### 4.1 Install Supabase CLI
Open PowerShell and run:

```powershell
npm install -g supabase
```

**Verify installation:**
```powershell
supabase --version
```

### 4.2 Initialize Supabase in Your Project
Navigate to your project directory:

```powershell
cd "c:\Users\Hassan\Desktop\Dilbar website\clone\dmarket-peek-and-seek-35708193"
```

Initialize Supabase:
```powershell
supabase init
```

This creates a `supabase/` folder structure.

### 4.3 Link to Your Supabase Project
Link your local project to the remote Supabase project:

```powershell
supabase link --project-ref your-project-id
```

**Replace** `your-project-id` with your Supabase project ID (from dashboard URL).

When prompted:
- **Enter database password:** Enter the password from Step 1.3
- **Create access token:** Follow the browser link to create a personal access token

---

## Step 5: Run Existing SQL Migrations

Your migration files are in: `supabase/migrations/`

### 5.1 Push Migrations to Supabase
Run all migration files on the remote database:

```powershell
supabase db push
```

This executes all `.sql` files in `supabase/migrations/` in order.

### 5.2 Verify Execution
If successful, you'll see:
```
✓ Pushed 55 migrations
✓ Database synced successfully
```

### 5.3 Check Migration Status
```powershell
supabase migration list
```

---

## Step 6: Install Supabase Client Library

Install the Supabase JavaScript client:

```powershell
npm install @supabase/supabase-js
```

Your project already has this dependency configured.

---

## Step 7: Test the Connection

### 7.1 Create a Test Script
Create a file: `test-supabase-connection.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Check auth status
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    console.log('✓ Auth endpoint working')
    
    // Test 2: Check database connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact' })
      .limit(1)
    
    if (error) throw error
    console.log('✓ Database connection working')
    console.log(`✓ Profiles table exists (${data?.length || 0} records)`)
    
    console.log('\n✓ All tests passed! Supabase is ready to use.')
    
  } catch (error) {
    console.error('✗ Connection test failed:', error.message)
    process.exit(1)
  }
}

testConnection()
```

### 7.2 Set up .env for Node.js
Create `.env` file in root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### 7.3 Run the Test
```powershell
node test-supabase-connection.js
```

Expected output:
```
Testing Supabase connection...
✓ Auth endpoint working
✓ Database connection working
✓ Profiles table exists
✓ All tests passed! Supabase is ready to use.
```

---

## Step 8: Example JavaScript Code to Connect

Your project already has a Supabase client configured. Here are common usage patterns:

### 8.1 Authentication - Sign Up
```typescript
import { supabase } from "@/integrations/supabase/client"

async function signUpUser(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
  
  if (error) throw error
  return data
}
```

### 8.2 Authentication - Sign In
```typescript
async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}
```

### 8.3 Query Data - Select
```typescript
async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}
```

### 8.4 Insert Data
```typescript
async function createRepair(repairData: any) {
  const { data, error } = await supabase
    .from('repairs')
    .insert([repairData])
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### 8.5 Update Data
```typescript
async function updateProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### 8.6 Delete Data
```typescript
async function deleteRepair(repairId: string) {
  const { error } = await supabase
    .from('repairs')
    .delete()
    .eq('id', repairId)
  
  if (error) throw error
}
```

### 8.7 Listen to Real-time Changes
```typescript
const subscription = supabase
  .channel('public:repairs')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'repairs' },
    (payload) => {
      console.log('Repair changed:', payload)
    }
  )
  .subscribe()

// Unsubscribe later
subscription.unsubscribe()
```

---

## Step 9: Verify Your Database

### 9.1 Access Supabase Dashboard
1. Go to Supabase Dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

### 9.2 Run a Test Query
```sql
SELECT * FROM profiles LIMIT 10;
```

Should return any users you've created.

### 9.3 View Tables
Click **"Database"** → **"Tables"** to see:
- ✓ `repairs`
- ✓ `profiles`
- ✓ `user_roles`
- ✓ Any other tables created by your migrations

---

## Step 10: Development Workflow

### 10.1 Creating New Migrations
When you modify your database schema:

```powershell
supabase migration new table_name
```

This creates a new migration file in `supabase/migrations/`.

### 10.2 Push to Supabase
```powershell
supabase db push
```

### 10.3 Pull Remote Changes
If others modify the database:

```powershell
supabase db pull
```

---

## Troubleshooting

### ❌ "Project URL not found"
- Verify `VITE_SUPABASE_URL` is correct
- Check the URL in Supabase dashboard → Settings → API

### ❌ "Invalid API Key"
- Ensure `VITE_SUPABASE_PUBLISHABLE_KEY` is exact
- Regenerate keys if needed: Settings → API → Reset keys

### ❌ "Connection refused"
- Check your internet connection
- Verify Supabase project status (may be initializing)
- Wait 1-2 minutes and try again

### ❌ "Could not push migrations"
- Ensure `.env.local` has correct database password
- Run `supabase link` again to re-authenticate
- Check migration file syntax

### ❌ "Table does not exist"
- Run `supabase db push` to execute pending migrations
- Check migration status: `supabase migration list`

---

## Next Steps

1. ✓ Update your `.env.local` with Supabase credentials
2. ✓ Run `supabase db push` to apply migrations
3. ✓ Test connection with `node test-supabase-connection.js`
4. ✓ Start your dev server: `npm run dev`
5. ✓ Test sign up in your app

Your application is now connected to Supabase!

---

## Security Reminders

- ⚠️ **Never commit `.env.local`** to git
- ⚠️ **Never share your Service Role Key** publicly
- ✓ Use Anon Key for client-side authentication
- ✓ Use Service Role Key only on server-side (Node.js, Supabase Functions)
- ✓ Enable Row Level Security (RLS) on all tables (already configured)

