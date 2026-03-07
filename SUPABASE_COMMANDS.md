# Quick Command Reference for Supabase Setup

## Installation
npm install -g supabase
npm install @supabase/supabase-js

## Initialize & Link Project
supabase init
supabase link --project-ref your-project-id

## Database Migrations
supabase db push              # Push local migrations to Supabase
supabase migration list       # View migration history
supabase migration new name   # Create a new migration file

## Pull Remote Changes
supabase db pull              # Sync remote changes locally

## View Database
supabase db start             # Start local Supabase instance (for local dev)
supabase db reset             # Reset local database

## Testing
node test-supabase-connection.js    # Test connection

## Environment Setup (.env.local)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_PASSWORD=your-database-password

## Common Issues & Fixes

### Error: "Could not push migrations"
- Run: supabase link --project-ref your-project-id
- Ensure .env.local has SUPABASE_DB_PASSWORD
- Check available storage space

### Error: "Missing environment variables"
- Create .env.local file
- Copy credentials from Supabase project settings
- Restart your terminal

### Error: "Table does not exist"
- Run: supabase db push
- Verify: supabase migration list
- Check: Select all tables in Supabase dashboard

### Can't connect locally
- Run: supabase start
- Use http://localhost:54321 as URL instead

---

For full details, see: SUPABASE_SETUP_GUIDE.md
