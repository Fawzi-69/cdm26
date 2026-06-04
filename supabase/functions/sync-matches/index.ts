// =====================================================================
// Edge Function: sync-matches
// Récupère les matchs + cotes de la Coupe du Monde 2026 depuis
// API-Football (via RapidAPI), upsert dans `matches`, puis calcule les
// points des paris terminés. À planifier toutes les 12 h (cron).
// =====================================================================
//
// Secrets requis (supabase secrets set ...):
//   - API_FOOTBALL_KEY        : ta clé RapidAPI
//   - SUPABASE_URL            : (injecté automatiquement)
//   - SUPABASE_SERVICE_ROLE_KEY : (injecté automatiquement)
//
// Barème de points :
//   - score exact correct        -> 3 pts
//   - sinon résultat 1/N/2 bon   -> 1 pt
//   - sinon                      -> 0 pt
//   - vainqueur du tournoi (fin) -> +10 pts
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Config compétition ---------------------------------------------
// World Cup = league 1 dans API-Football ; saison 2026.
const LEAGUE_ID = 1
const SEASON = 2026
const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com'
const API_BASE = `https://${RAPIDAPI_HOST}/v3`

// Conversion d'un nom de pays -> code ISO-2 pour flagcdn (best effort).
// L'API renvoie aussi un logo ; on garde le code pays quand on le connaît.
function flagCodeFromCountry(name: string): string | null {
  const map: Record<string, string> = {
    Argentina: 'ar', France: 'fr', Brazil: 'br', England: 'gb-eng',
    Spain: 'es', Germany: 'de', Portugal: 'pt', Netherlands: 'nl',
    Belgium: 'be', Croatia: 'hr', Italy: 'it', Uruguay: 'uy',
    Morocco: 'ma', USA: 'us', 'United-States': 'us', Mexico: 'mx',
    Canada: 'ca', Japan: 'jp', 'South-Korea': 'kr', Senegal: 'sn',
    Switzerland: 'ch', Denmark: 'dk', Poland: 'pl', Serbia: 'rs',
    Ghana: 'gh', Cameroon: 'cm', Ecuador: 'ec', Qatar: 'qa',
    'Saudi-Arabia': 'sa', Australia: 'au', Tunisia: 'tn', Iran: 'ir',
    Colombia: 'co', Nigeria: 'ng', Egypt: 'eg', Algeria: 'dz',
    'Ivory-Coast': 'ci', Ukraine: 'ua', Austria: 'at', Wales: 'gb-wls',
    Scotland: 'gb-sct', Norway: 'no', Sweden: 'se', Turkey: 'tr',
    Peru: 'pe', Chile: 'cl', Paraguay: 'py', 'Costa-Rica': 'cr',
    Panama: 'pa', Jamaica: 'jm', 'New-Zealand': 'nz',
  }
  return map[name?.replaceAll(' ', '-')] ?? null
}

interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } }
  league: { round: string }
  teams: { home: { name: string }; away: { name: string } }
  goals: { home: number | null; away: number | null }
}

async function apiFetch(path: string, key: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  })
  if (!res.ok) {
    throw new Error(`API-Football ${path} -> ${res.status} ${await res.text()}`)
  }
  const json = await res.json()
  return json.response ?? []
}

// status API -> status interne
function mapStatus(short: string): string {
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished'
  if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(short)) return 'live'
  return 'scheduled'
}

Deno.serve(async () => {
  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY')
    if (!API_KEY) throw new Error('API_FOOTBALL_KEY manquant')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Fixtures de la compétition
    const fixtures: ApiFixture[] = await apiFetch(
      `/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
      API_KEY,
    )

    // 2) Cotes 1X2 (marché "Match Winner", bookmaker premier dispo)
    const oddsByFixture: Record<number, { home?: number; draw?: number; away?: number }> = {}
    const odds = await apiFetch(`/odds?league=${LEAGUE_ID}&season=${SEASON}`, API_KEY)
    for (const o of odds) {
      const fid = o.fixture?.id
      const bet = o.bookmakers?.[0]?.bets?.find((b: any) => b.name === 'Match Winner')
      if (!fid || !bet) continue
      const vals: Record<string, number> = {}
      for (const v of bet.values) vals[v.value] = parseFloat(v.odd)
      oddsByFixture[fid] = { home: vals['Home'], draw: vals['Draw'], away: vals['Away'] }
    }

    // 3) Upsert des matchs
    const rows = fixtures.map((f) => {
      const od = oddsByFixture[f.fixture.id] ?? {}
      return {
        api_match_id: f.fixture.id,
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        home_flag: flagCodeFromCountry(f.teams.home.name),
        away_flag: flagCodeFromCountry(f.teams.away.name),
        match_date: f.fixture.date,
        stage: f.league.round,
        status: mapStatus(f.fixture.status.short),
        home_score: f.goals.home,
        away_score: f.goals.away,
        home_odds: od.home ?? null,
        draw_odds: od.draw ?? null,
        away_odds: od.away ?? null,
        updated_at: new Date().toISOString(),
      }
    })

    if (rows.length) {
      const { error } = await supabase
        .from('matches')
        .upsert(rows, { onConflict: 'api_match_id' })
      if (error) throw error
    }

    // 4) Calcul des points pour les matchs terminés non encore notés
    const scored = await scoreFinishedMatches(supabase)

    // 5) Bonus vainqueur du tournoi si la finale est terminée
    const winnerBonus = await applyTournamentWinnerBonus(supabase)

    return Response.json({
      ok: true,
      fixtures: rows.length,
      odds: Object.keys(oddsByFixture).length,
      bets_scored: scored,
      winner_bonus_awarded: winnerBonus,
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Calcule points_earned des paris des matchs terminés, puis met à jour
// total_points des membres concernés. Renvoie le nb de paris notés.
async function scoreFinishedMatches(supabase: any): Promise<number> {
  const { data: finished } = await supabase
    .from('matches')
    .select('id, home_score, away_score, status')
    .eq('status', 'finished')

  if (!finished?.length) return 0

  let scoredCount = 0
  const dirtyMembers = new Set<string>() // `${group_id}:${user_id}`

  for (const m of finished) {
    if (m.home_score === null || m.away_score === null) continue

    const { data: bets } = await supabase
      .from('bets')
      .select('id, user_id, group_id, prediction, predicted_home_score, predicted_away_score, points_earned')
      .eq('match_id', m.id)
      .is('points_earned', null)

    if (!bets?.length) continue

    const realResult =
      m.home_score > m.away_score ? 'home'
      : m.home_score < m.away_score ? 'away'
      : 'draw'

    for (const b of bets) {
      let pts = 0
      if (b.predicted_home_score === m.home_score && b.predicted_away_score === m.away_score) {
        pts = 3 // score exact
      } else if (b.prediction === realResult) {
        pts = 1 // bon résultat
      }
      const { error } = await supabase
        .from('bets')
        .update({ points_earned: pts })
        .eq('id', b.id)
      if (!error) {
        scoredCount++
        dirtyMembers.add(`${b.group_id}:${b.user_id}`)
      }
    }
  }

  // Recalcule total_points pour chaque (group, user) impacté
  for (const key of dirtyMembers) {
    const [group_id, user_id] = key.split(':')
    await recomputeMemberTotal(supabase, group_id, user_id)
  }

  return scoredCount
}

// total_points = somme des bets.points_earned + bonus vainqueur
async function recomputeMemberTotal(supabase: any, group_id: string, user_id: string) {
  const { data: betPts } = await supabase
    .from('bets')
    .select('points_earned')
    .eq('group_id', group_id)
    .eq('user_id', user_id)
    .not('points_earned', 'is', null)

  const { data: winPts } = await supabase
    .from('tournament_winner_bets')
    .select('points_earned')
    .eq('group_id', group_id)
    .eq('user_id', user_id)
    .not('points_earned', 'is', null)

  const total =
    (betPts ?? []).reduce((s: number, r: any) => s + Number(r.points_earned), 0) +
    (winPts ?? []).reduce((s: number, r: any) => s + Number(r.points_earned), 0)

  await supabase
    .from('group_members')
    .update({ total_points: total })
    .eq('group_id', group_id)
    .eq('user_id', user_id)
}

// Si la finale est terminée, attribue +10 aux paris vainqueur corrects.
async function applyTournamentWinnerBonus(supabase: any): Promise<number> {
  const { data: finalMatch } = await supabase
    .from('matches')
    .select('home_team, away_team, home_score, away_score, status')
    .ilike('stage', '%Final%')
    .not('stage', 'ilike', '%Semi%')
    .not('stage', 'ilike', '%Quarter%')
    .eq('status', 'finished')
    .order('match_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!finalMatch || finalMatch.home_score === null) return 0

  const champion =
    finalMatch.home_score > finalMatch.away_score
      ? finalMatch.home_team
      : finalMatch.away_team

  // Paris vainqueur non encore notés
  const { data: wbets } = await supabase
    .from('tournament_winner_bets')
    .select('id, user_id, group_id, team')
    .is('points_earned', null)

  if (!wbets?.length) return 0

  let awarded = 0
  const dirty = new Set<string>()
  for (const w of wbets) {
    const pts = w.team === champion ? 10 : 0
    await supabase.from('tournament_winner_bets').update({ points_earned: pts }).eq('id', w.id)
    if (pts > 0) awarded++
    dirty.add(`${w.group_id}:${w.user_id}`)
  }
  for (const key of dirty) {
    const [g, u] = key.split(':')
    await recomputeMemberTotal(supabase, g, u)
  }
  return awarded
}
