# CDM26 ⚽ — Pronostics Coupe du Monde 2026

Application de pronostics entre amis : crée un groupe, pronostique le **résultat (1/N/2)** et le **score exact** de chaque match, parie sur le **vainqueur du tournoi**, et grimpe au **classement temps réel**.

- **Stack** : React + Vite + Tailwind · Supabase (auth, DB, Realtime) · API-Football (RapidAPI) · GitHub Pages.

## Barème
| Pari | Points |
|------|--------|
| Bon résultat 1/N/2 | **1 pt** |
| Score exact | **3 pts** (remplace le point de résultat) |
| Vainqueur de la CdM (fin du tournoi) | **+10 pts** |

Les cotes officielles sont affichées mais **n'influencent pas** les points.

---

## 1. Installation locale
```bash
npm install
cp .env.example .env   # valeurs Supabase déjà pré-remplies
npm run dev
```
App sur http://localhost:5173

## 2. Base de données Supabase
Dans le **SQL Editor** du projet Supabase, exécute le contenu de
`supabase/migrations/001_init.sql` (tables, RLS, RPC `create_group` / `join_group`, Realtime).

> Pense à **activer Realtime** sur le projet (la migration ajoute déjà `group_members`, `matches`, `bets` à la publication `supabase_realtime`).

## 3. Edge Function `sync-matches`
Récupère matchs + cotes de l'API-Football et calcule les points (toutes les 12 h).

```bash
# Authentifie le CLI puis lie le projet
supabase login
supabase link --project-ref opilqjghbbmcdubgdwjs

# Secret RapidAPI (NE PAS committer la clé)
supabase secrets set API_FOOTBALL_KEY=ta_cle_rapidapi

# Déploiement
supabase functions deploy sync-matches
```

### Planification toutes les 12 h
Dans Supabase → **Database → Cron Jobs** (extension `pg_cron`), ou via SQL :
```sql
select cron.schedule(
  'sync-matches-12h',
  '0 */12 * * *',
  $$ select net.http_post(
       url := 'https://opilqjghbbmcdubgdwjs.functions.supabase.co/sync-matches',
       headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
     ); $$
);
```
Test manuel :
```bash
curl -X POST https://opilqjghbbmcdubgdwjs.functions.supabase.co/sync-matches \
  -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>"
```

> ℹ️ La compétition est ciblée via `LEAGUE_ID=1` / `SEASON=2026` dans `supabase/functions/sync-matches/index.ts`. Ajuste si l'ID de la Coupe du Monde 2026 diffère sur ton abonnement RapidAPI.

## 4. Déploiement GitHub Pages
1. Crée le repo GitHub **`cdm26`** (compte `Fawzi-69`).
2. Push sur `main`.
3. Repo → **Settings → Pages → Source = GitHub Actions**.
4. (Optionnel) Repo → **Settings → Secrets → Actions** : ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (sinon les valeurs par défaut de `src/lib/supabase.js` sont utilisées).

Le workflow `.github/workflows/deploy.yml` build + déploie à chaque push sur `main`.

Déploiement manuel possible :
```bash
npm run deploy   # vite build && gh-pages -d dist
```

App en ligne : **https://Fawzi-69.github.io/cdm26**

---

## Structure
```
src/
  lib/        supabase.js, nations.js (48 nations + flagcdn)
  context/    AuthContext, GroupContext
  components/ Navbar, ProtectedRoute, MatchCard, TournamentWinnerBanner
  pages/      Auth, Join, Dashboard, Leaderboard, MyBets
supabase/
  migrations/001_init.sql
  functions/sync-matches/index.ts
```

## Notes
- Routing en **HashRouter** (`/#/...`) pour compatibilité GitHub Pages.
- Un pari est **immuable** : verrouillé côté UI + contrainte `UNIQUE(user_id, group_id, match_id)` en DB.
- Confirmation email : selon les réglages Auth de ton projet Supabase (désactive-la pour des tests rapides).
