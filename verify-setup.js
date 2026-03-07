#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('\n🔍 Supabase Setup Verification Checklist\n')
console.log('=' . repeat(50))

let checksPass = 0
let checksFail = 0

function checkPass(label, detail = '') {
  console.log(`✅ ${label}`)
  if (detail) console.log(`   ${detail}`)
  checksPass++
}

function checkFail(label, detail = '', fix = '') {
  console.log(`❌ ${label}`)
  if (detail) console.log(`   ${detail}`)
  if (fix) console.log(`   → Fix: ${fix}`)
  checksFail++
}

// 1. Check .env.local exists
console.log('\n📋 Environment Setup')
console.log('-' . repeat(50))

const envPath = path.join(__dirname, '.env.local')
const envExamplePath = path.join(__dirname, '.env.local.example')

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const hasUrl = envContent.includes('VITE_SUPABASE_URL=')
  const hasKey = envContent.includes('VITE_SUPABASE_PUBLISHABLE_KEY=')
  
  if (hasUrl && hasKey) {
    checkPass('.env.local exists with credentials')
  } else {
    checkFail('.env.local incomplete', 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY', 'Add missing variables from Supabase dashboard')
  }
} else {
  checkFail('.env.local file not found', 'Required for Supabase connection', `Copy .env.local.example to .env.local and fill in your credentials`)
}

if (fs.existsSync(envExamplePath)) {
  checkPass('.env.local.example template exists')
} else {
  checkFail('.env.local.example template missing')
}

// 2. Check package.json has Supabase dependency
console.log('\n📦 Dependencies')
console.log('-' . repeat(50))

const packageJsonPath = path.join(__dirname, 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  
  if (packageJson.dependencies?.['@supabase/supabase-js']) {
    checkPass(`@supabase/supabase-js v${packageJson.dependencies['@supabase/supabase-js']}`)
  } else {
    checkFail('@supabase/supabase-js not found', 'Required for database connection', 'Run: npm install @supabase/supabase-js')
  }
  
  // Check other key dependencies
  const hasReact = packageJson.dependencies?.['react']
  const hasReactRouter = packageJson.dependencies?.['react-router-dom']
  
  if (hasReact && hasReactRouter) {
    checkPass('React and React Router configured')
  }
} else {
  checkFail('package.json not found')
}

// 3. Check Supabase project structure
console.log('\n🗁️  Project Structure')
console.log('-' . repeat(50))

const supabasePath = path.join(__dirname, 'supabase')
const migrationsPath = path.join(supabasePath, 'migrations')
const srcPath = path.join(__dirname, 'src')
const integrationPath = path.join(srcPath, 'integrations', 'supabase')

if (fs.existsSync(supabasePath)) {
  checkPass('supabase/ folder exists')
  
  if (fs.existsSync(migrationsPath)) {
    const migrationFiles = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'))
    checkPass(`supabase/migrations/ exists (${migrationFiles.length} migration files)`)
    
    if (migrationFiles.length > 0) {
      const exampleFile = migrationFiles[0]
      console.log(`   Example: ${exampleFile}`)
    }
  } else {
    checkFail('supabase/migrations/ folder not found')
  }
} else {
  checkFail('supabase/ folder not found', 'This folder should contain your database configuration')
}

if (fs.existsSync(integrationPath)) {
  const clientFile = path.join(integrationPath, 'client.ts')
  const typesFile = path.join(integrationPath, 'types.ts')
  
  checkPass('src/integrations/supabase/ exists')
  
  if (fs.existsSync(clientFile)) {
    checkPass('Supabase client configured (client.ts)')
  } else {
    checkFail('client.ts not found in supabase integration folder')
  }
  
  if (fs.existsSync(typesFile)) {
    checkPass('Supabase types available (types.ts)')
  }
} else {
  checkFail('Supabase integration folder not found')
}

// 4. Check setup documentation files
console.log('\n📚 Documentation')
console.log('-' . repeat(50))

const docsFiles = [
  { path: 'SUPABASE_SETUP_GUIDE.md', desc: 'Complete setup guide' },
  { path: 'SUPABASE_COMMANDS.md', desc: 'CLI command reference' },
  { path: 'SETUP_VISUAL_GUIDE.md', desc: 'Visual step-by-step guide' },
]

docsFiles.forEach(({ path: docPath, desc }) => {
  const fullPath = path.join(__dirname, docPath)
  if (fs.existsSync(fullPath)) {
    checkPass(`${path}: ${desc}`)
  } else {
    checkFail(`${path} not found`, desc)
  }
})

// 5. Check test files
console.log('\n🧪 Testing')
console.log('-' . repeat(50))

const testFile = path.join(__dirname, 'test-supabase-connection.js')
if (fs.existsSync(testFile)) {
  checkPass('test-supabase-connection.js exists')
  console.log('\n   Run: node test-supabase-connection.js')
} else {
  checkFail('test-supabase-connection.js not found', 'Test script is needed to verify connection')
}

// 6. Environment variable validation
console.log('\n🔐 Credentials Validation')
console.log('-' . repeat(50))

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n').filter(l => !l.startsWith('#') && l.trim())
  
  let urlValid = false
  let keyValid = false
  
  lines.forEach(line => {
    if (line.includes('VITE_SUPABASE_URL=')) {
      const value = line.split('=')[1]?.trim()
      if (value && value.includes('.supabase.co')) {
        checkPass('VITE_SUPABASE_URL format correct')
        urlValid = true
      } else {
        checkFail('VITE_SUPABASE_URL format invalid', 'Should be: https://xxx.supabase.co', 'Copy from Supabase dashboard → Settings → API')
      }
    }
    
    if (line.includes('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
      const value = line.split('=')[1]?.trim()
      if (value && value.startsWith('eyJ')) {
        checkPass('VITE_SUPABASE_PUBLISHABLE_KEY format correct')
        keyValid = true
      } else if (value && value !== '') {
        checkFail('VITE_SUPABASE_PUBLISHABLE_KEY format suspicious', 'Should start with: eyJ', 'Copy from Supabase dashboard → Settings → API')
      }
    }
  })
  
  if (!urlValid && !keyValid) {
    console.log('   Note: Credentials not fully filled yet')
  }
}

// Summary
console.log('\n' + '=' . repeat(50))
console.log('\n📊 Summary')
console.log(`✅ Passed: ${checksPass}`)
console.log(`❌ Failed: ${checksFail}`)
console.log()

if (checksFail === 0) {
  console.log('🎉 All checks passed! You\'re ready to use Supabase.\n')
  console.log('Next steps:')
  console.log('1. Run: supabase link --project-ref your-project-id')
  console.log('2. Run: supabase db push')
  console.log('3. Run: node test-supabase-connection.js')
  console.log('4. Run: npm run dev\n')
  process.exit(0)
} else {
  console.log('⚠️  Fix the errors above before continuing.\n')
  console.log('Need help? See SUPABASE_SETUP_GUIDE.md or SETUP_VISUAL_GUIDE.md\n')
  process.exit(1)
}
