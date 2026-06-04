// Ajuste la config Auth Supabase via l'API Management :
//  - mailer_autoconfirm = true  (plus de mail de confirmation à l'inscription)
//  - ajoute localhost à la liste des redirections autorisées (reset password)
// Usage: SUPABASE_TOKEN=... node scripts/set-auth.mjs
const token = process.env.SUPABASE_TOKEN
const ref = process.env.SUPABASE_REF || 'opilqjghbbmcdubgdwjs'
if (!token) throw new Error('SUPABASE_TOKEN manquant')

const base = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

// 1) Lire la config actuelle
const cur = await (await fetch(base, { headers: H })).json()
console.log('AVANT:', {
  mailer_autoconfirm: cur.mailer_autoconfirm,
  site_url: cur.site_url,
  uri_allow_list: cur.uri_allow_list,
})

// 2) Construire la nouvelle allow-list (conserve l'existant + localhost)
const existing = (cur.uri_allow_list || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const SITE = process.env.SITE_URL || 'https://cdm26-rose.vercel.app'
const wanted = [
  'http://localhost:5173/**',
  'http://localhost:4173/**',
  `${SITE}/**`,
]
const merged = Array.from(new Set([...existing, ...wanted])).join(',')

// 3) Patch (autoconfirm + allow-list + site_url de prod)
const res = await fetch(base, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({
    mailer_autoconfirm: true,
    uri_allow_list: merged,
    site_url: SITE,
  }),
})
const out = await res.json()
console.log('HTTP', res.status)
console.log('APRES:', {
  mailer_autoconfirm: out.mailer_autoconfirm,
  uri_allow_list: out.uri_allow_list,
})
