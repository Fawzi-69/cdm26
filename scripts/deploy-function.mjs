// Déploie l'Edge Function sync-matches + pose le secret API_FOOTBALL_KEY
// via l'API Management Supabase.
// Usage: SUPABASE_TOKEN=... API_FOOTBALL_KEY=... node scripts/deploy-function.mjs
import { readFileSync } from 'node:fs'

const token = process.env.SUPABASE_TOKEN
const ref = process.env.SUPABASE_REF || 'opilqjghbbmcdubgdwjs'
const apiKey = process.env.API_FOOTBALL_KEY
const SLUG = 'sync-matches'

if (!token) throw new Error('SUPABASE_TOKEN manquant')

const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const base = `https://api.supabase.com/v1/projects/${ref}`

async function j(label, res) {
  const t = await res.text()
  console.log(`\n== ${label} -> HTTP ${res.status}`)
  console.log(t.slice(0, 1500))
  return { ok: res.ok, status: res.status, text: t }
}

// 1) Secret
if (apiKey) {
  const r = await fetch(`${base}/secrets`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify([{ name: 'API_FOOTBALL_KEY', value: apiKey }]),
  })
  await j('secret API_FOOTBALL_KEY', r)
}

// 2) Déploiement (multipart deploy endpoint)
const source = readFileSync('supabase/functions/sync-matches/index.ts', 'utf8')

const metadata = {
  name: SLUG,
  entrypoint_path: 'index.ts',
  verify_jwt: false,
}

const form = new FormData()
form.append('metadata', JSON.stringify(metadata))
form.append(
  'file',
  new Blob([source], { type: 'application/typescript' }),
  'index.ts',
)

const deployRes = await fetch(`${base}/functions/deploy?slug=${SLUG}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // pas de Content-Type: laissé à FormData
  body: form,
})
const dep = await j('deploy sync-matches', deployRes)

process.exit(dep.ok ? 0 : 1)
