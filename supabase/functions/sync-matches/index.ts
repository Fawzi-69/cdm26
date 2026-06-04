// =====================================================================
// Edge Function: sync-matches
// Récupère matchs, cotes (h2h) et résultats de la Coupe du Monde 2026
// depuis The Odds API (https://the-odds-api.com), upsert dans `matches`,
// puis calcule les points des pronos terminés.
// =====================================================================
//
// Secrets requis (supabase secrets set ...):
//   - ODDS_API_KEY               : ta clé The Odds API
//   - SUPABASE_URL               : (injecté automatiquement)
//   - SUPABASE_SERVICE_ROLE_KEY  : (injecté automatiquement)
//
// Barème de points :
//   - score exact correct        -> 3 pts
//   - sinon résultat 1/N/2 bon   -> 1 pt
//   - sinon                      -> 0 pt
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SPORT = 'soccer_fifa_world_cup'
const API_BASE = 'https://api.the-odds-api.com/v4'

// Nom de pays (anglais, fourni par The Odds API) -> code flagcdn (best effort).
function flagCodeFromCountry(name: string): string | null {
  const map: Record<string, string> = {
    Argentina: 'ar', France: 'fr', Brazil: 'br', England: 'gb-eng',
    Spain: 'es', Germany: 'de', Portugal: 'pt', Netherlands: 'nl',
    Belgium: 'be', Croatia: 'hr', Italy: 'it', Uruguay: 'uy',
    Morocco: 'ma', USA: 'us', 'United States': 'us', Mexico: 'mx',
    Canada: 'ca', Japan: 'jp', 'South Korea': 'kr', Senegal: 'sn',
    Switzerland: 'ch', Denmark: 'dk', Poland: 'pl', Serbia: 'rs',
    Ghana: 'gh', Cameroon: 'cm', Ecuador: 'ec', Qatar: 'qa',
    'Saudi Arabia': 'sa', Australia: 'au', Tunisia: 'tn', Iran: 'ir',
    Colombia: 'co', Nigeria: 'ng', Egypt: 'eg', Algeria: 'dz',
    'Ivory Coast': 'ci', Ukraine: 'ua', Austria: 'at', Wales: 'gb-wls',
    Scotland: 'gb-sct', Norway: 'no', Sweden: 'se', Turkey: 'tr',
    Peru: 'pe', Chile: 'cl', Paraguay: 'py', 'Costa Rica': 'cr',
    Panama: 'pa', Jamaica: 'jm', 'New Zealand': 'nz',
  }
  return map[name] ?? null
}

function mapStatus(commenceIso: string, completed: boolean): string {
  if (completed) return 'finished'
  if (new Date(commenceIso).getTime() <= Date.now()) return 'live'
  return 'scheduled'
}

interface OddsEvent {
  id: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers?: Array<{ markets?: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }> }>
}
interface ScoreEvent {
  id: string
  commence_time: string
  completed: boolean
  home_team: string
  away_team: string
  scores: Array<{ name: string; score: string }> | null
}

function parseOdds(e: OddsEvent) {
  const market = e.bookmakers?.[0]?.markets?.find((m) => m.key === 'h2h')
  let home: number | null = null, draw: number | null = null, away: number | null = null
  for (const o of market?.outcomes ?? []) {
    if (o.name === e.home_team) home = o.price
    else if (o.name === e.away_team) away = o.price
    else if (o.name === 'Draw') draw = o.price
  }
  return { home_odds: home, draw_odds: draw, away_odds: away }
}

function parseScores(e: ScoreEvent) {
  let home: number | null = null, away: number | null = null
  for (const s of e.scores ?? []) {
    const v = parseInt(s.score, 10)
    if (s.name === e.home_team) home = Number.isNaN(v) ? null : v
    else if (s.name === e.away_team) away = Number.isNaN(v) ? null : v
  }
  return { home_score: home, away_score: away }
}

Deno.serve(async () => {
  try {
    const API_KEY = Deno.env.get('ODDS_API_KEY')
    if (!API_KEY) throw new Error('ODDS_API_KEY manquant')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Cotes (marché h2h, région eu, format décimal)
    const oddsRes = await fetch(
      `${API_BASE}/sports/${SPORT}/odds?apiKey=${API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`,
    )
    if (!oddsRes.ok) throw new Error(`Odds API /odds -> ${oddsRes.status} ${await oddsRes.text()}`)
    const oddsEvents: OddsEvent[] = await oddsRes.json()

    // 2) Scores / résultats (2 derniers jours)
    const scoresRes = await fetch(`${API_BASE}/sports/${SPORT}/scores?apiKey=${API_KEY}&daysFrom=2`)
    if (!scoresRes.ok) throw new Error(`Odds API /scores -> ${scoresRes.status} ${await scoresRes.text()}`)
    const scoreEvents: ScoreEvent[] = await scoresRes.json()

    // Fusion par id d'événement
    const byId = new Map<string, any>()
    for (const e of oddsEvents) {
      byId.set(e.id, {
        odds_event_id: e.id,
        home_team: e.home_team,
        away_team: e.away_team,
        match_date: e.commence_time,
        status: mapStatus(e.commence_time, false),
        home_score: null,
        away_score: null,
        ...parseOdds(e),
      })
    }
    for (const e of scoreEvents) {
      const prev = byId.get(e.id) ?? {
        odds_event_id: e.id,
        home_odds: null, draw_odds: null, away_odds: null,
      }
      byId.set(e.id, {
        ...prev,
        home_team: e.home_team ?? prev.home_team,
        away_team: e.away_team ?? prev.away_team,
        match_date: e.commence_time ?? prev.match_date,
        status: mapStatus(e.commence_time, e.completed),
        ...parseScores(e),
      })
    }

    const rows = [...byId.values()].map((r) => ({
      odds_event_id: r.odds_event_id,
      home_team: r.home_team,
      away_team: r.away_team,
      home_flag: flagCodeFromCountry(r.home_team),
      away_flag: flagCodeFromCountry(r.away_team),
      match_date: r.match_date,
      stage: 'Coupe du Monde 2026',
      status: r.status,
      home_score: r.home_score ?? null,
      away_score: r.away_score ?? null,
      home_odds: r.home_odds ?? null,
      draw_odds: r.draw_odds ?? null,
      away_odds: r.away_odds ?? null,
      updated_at: new Date().toISOString(),
    }))

    if (rows.length) {
      const { error } = await supabase.from('matches').upsert(rows, { onConflict: 'odds_event_id' })
      if (error) throw error
    }

    const scored = await scoreFinishedMatches(supabase)

    return Response.json({
      ok: true,
      events: rows.length,
      odds: oddsEvents.length,
      scores: scoreEvents.length,
      bets_scored: scored,
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Calcule points_earned des pronos des matchs terminés, puis met à jour
// total_points des membres concernés. Renvoie le nb de pronos notés.
async function scoreFinishedMatches(supabase: any): Promise<number> {
  const { data: finished } = await supabase
    .from('matches')
    .select('id, home_score, away_score, status')
    .eq('status', 'finished')

  if (!finished?.length) return 0

  let scoredCount = 0
  const dirtyMembers = new Set<string>()

  for (const m of finished) {
    if (m.home_score === null || m.away_score === null) continue

    const { data: bets } = await supabase
      .from('bets')
      .select('id, user_id, group_id, prediction, predicted_home_score, predicted_away_score, points_earned')
      .eq('match_id', m.id)
      .is('points_earned', null)

    if (!bets?.length) continue

    const realResult =
      m.home_score > m.away_score ? 'home' : m.home_score < m.away_score ? 'away' : 'draw'

    for (const b of bets) {
      let pts = 0
      if (b.predicted_home_score === m.home_score && b.predicted_away_score === m.away_score) {
        pts = 3
      } else if (b.prediction === realResult) {
        pts = 1
      }
      const { error } = await supabase.from('bets').update({ points_earned: pts }).eq('id', b.id)
      if (!error) {
        scoredCount++
        dirtyMembers.add(`${b.group_id}:${b.user_id}`)
      }
    }
  }

  for (const key of dirtyMembers) {
    const [group_id, user_id] = key.split(':')
    await recomputeMemberTotal(supabase, group_id, user_id)
  }

  return scoredCount
}

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
