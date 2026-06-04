// Exécute une migration SQL via l'API Management Supabase.
// Usage: SUPABASE_TOKEN=... node scripts/run-migration.mjs <fichier.sql>
import { readFileSync } from 'node:fs'

const token = process.env.SUPABASE_TOKEN
const ref = process.env.SUPABASE_REF || 'opilqjghbbmcdubgdwjs'
const file = process.argv[2] || 'supabase/migrations/001_init.sql'

if (!token) {
  console.error('SUPABASE_TOKEN manquant')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const text = await res.text()
console.log('HTTP', res.status)
console.log(text)
process.exit(res.ok ? 0 : 1)
