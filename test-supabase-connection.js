import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('Please create a .env file with:')
  console.error('  VITE_SUPABASE_URL=...')
  console.error('  VITE_SUPABASE_PUBLISHABLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testConnection() {
  try {
    console.log('\n🔍 Testing Supabase Connection...\n')
    console.log(`URL: ${SUPABASE_URL}`)
    console.log(`Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`)
    
    // Test 1: Check auth endpoint
    console.log('\n1️⃣  Testing Auth Endpoint...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    console.log('   ✓ Auth endpoint working')
    
    // Test 2: Check if profiles table exists
    console.log('\n2️⃣  Testing Database Connection (profiles table)...')
    const { data: profilesData, error: profilesError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (profilesError) throw profilesError
    console.log(`   ✓ Profiles table exists (${count || 0} records)`)
    
    // Test 3: Check if repairs table exists
    console.log('\n3️⃣  Testing Repairs Table...')
    const { data: repairsData, error: repairsError, count: repairCount } = await supabase
      .from('repairs')
      .select('*', { count: 'exact', head: true })
    
    if (repairsError) throw repairsError
    console.log(`   ✓ Repairs table exists (${repairCount || 0} records)`)
    
    // Test 4: Check if user_roles table exists
    console.log('\n4️⃣  Testing User Roles Table...')
    const { data: rolesData, error: rolesError, count: rolesCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
    
    if (rolesError) throw rolesError
    console.log(`   ✓ User roles table exists (${rolesCount || 0} records)`)
    
    console.log('\n✅ All tests passed! Supabase is ready to use.\n')
    return true
    
  } catch (error) {
    console.error('\n❌ Connection test failed!')
    console.error('Error:', error.message)
    console.error('\nTroubleshooting tips:')
    console.error('1. Check that your .env file has correct values')
    console.error('2. Verify VITE_SUPABASE_URL is in format: https://xxx.supabase.co')
    console.error('3. Ensure VITE_SUPABASE_PUBLISHABLE_KEY starts with eyJ...')
    console.error('4. Run: supabase db push (to apply migrations)')
    process.exit(1)
  }
}

testConnection()
