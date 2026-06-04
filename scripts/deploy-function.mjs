// Déploie une Edge Function via l'API Management Supabase, et pose
// éventuellement le secret ODDS_API_KEY.
// Usage:
//   SUPABASE_TOKEN=... [ODDS_API_KEY=...] node scripts/deploy-function.mjs <slug> [slug2 ...]
import { readFileSync } from 'node:fs'

const token = process.env.SUPABASE_TOKEN
const ref = process.env.SUPABASE_REF || 'opilqjghbbmcdubgdwjs'
const oddsKey = process.env.ODDS_API_KEY
const slugs = process.argv.slice(2)

if (!token) throw new Error('SUPABASE_TOKEN manquant')
if (!slugs.length) throw new Error('Indique au moins un slug de fonction')

const base = `https://api.supabase.com/v1/projects/${ref}`

async function logRes(label, res) {
  const t = await res.text()
  console.log(`\n== ${label} -> HTTP ${res.status}`)
  console.log(t.slice(0, 1200))
  return res.ok
}

// Secret ODDS_API_KEY (optionnel)
if (oddsKey) {
  const r = await fetch(`${base}/secrets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ name: 'ODDS_API_KEY', value: oddsKey }]),
  })
  await logRes('secret ODDS_API_KEY', r)
}

// Déploiement de chaque fonction
for (const slug of slugs) {
  const source = readFileSync(`supabase/functions/${slug}/index.ts`, 'utf8')
  const form = new FormData()
  form.append('metadata', JSON.stringify({ name: slug, entrypoint_path: 'index.ts', verify_jwt: false }))
  form.append('file', new Blob([source], { type: 'application/typescript' }), 'index.ts')

  const res = await fetch(`${base}/functions/deploy?slug=${slug}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  await logRes(`deploy ${slug}`, res)
}
