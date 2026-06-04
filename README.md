# CDM26 ⚽ — Pronostics Coupe du Monde 2026

Application de pronostics entre amis : crée un groupe, pronostique le **résultat (1/N/2)** et le **score exact** de chaque match, choisis le **vainqueur du tournoi**, et grimpe au **classement temps réel**.

- **Stack** : React + Vite + Tailwind (PWA) · Supabase (auth, DB, Realtime) · The Odds API · Vercel.

## Barème
| Prono | Points |
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

## 3. Edge Functions (The Odds API)
- **`sync-matches`** : récupère matchs, cotes (h2h) et résultats depuis [The Odds API](https://the-odds-api.com), upsert dans `matches`, calcule les points. Cron toutes les 12 h (`config.toml`).
- **`trigger-match-sync`** : cron toutes les 5 min qui ne consomme **aucune** requête API ; il appelle `sync-matches` uniquement quand un match programmé vient de se terminer (heure de fin prévue dépassée). Max 3 déclenchements/appel.

```bash
# Authentifie le CLI puis lie le projet
supabase login
supabase link --project-ref opilqjghbbmcdubgdwjs

# Secret The Odds API (NE PAS committer la clé)
supabase secrets set ODDS_API_KEY=ta_cle_the_odds_api

# Déploiement (lit les schedules dans config.toml)
supabase functions deploy sync-matches
supabase functions deploy trigger-match-sync
```

Test manuel :
```bash
curl -X POST https://opilqjghbbmcdubgdwjs.functions.supabase.co/sync-matches
```

> ℹ️ La compétition ciblée est `soccer_fifa_world_cup` dans `supabase/functions/sync-matches/index.ts`.

## 4. Déploiement Vercel
1. Va sur **https://vercel.com/new** et importe le repo GitHub **`Fawzi-69/cdm26`**.
2. Vercel détecte **Vite** automatiquement (Build : `npm run build`, Output : `dist`).
3. (Optionnel) **Environment Variables** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (sinon les valeurs par défaut de `src/lib/supabase.js` sont utilisées).
4. **Deploy**. Chaque push sur `main` redéploie automatiquement.

Le fichier `vercel.json` gère le fallback SPA (rewrites vers `/index.html`).

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
- Routing en **BrowserRouter** (URLs propres `/dashboard`). Le fallback SPA est assuré par `vercel.json` (rewrites vers `/index.html`).
- Un prono est **immuable** : verrouillé côté UI + contrainte `UNIQUE(user_id, group_id, match_id)` en DB.
- Confirmation email : selon les réglages Auth de ton projet Supabase (désactive-la pour des tests rapides).
