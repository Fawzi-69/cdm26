// =====================================================================
// Edge Function: trigger-match-sync
// Cron "intelligent" (toutes les 5 min) : ne consomme AUCUNE requête The
// Odds API par lui-même. Il interroge seulement la table `matches` et,
// quand un match programmé vient de se terminer (heure de fin prévue
// dépassée), il déclenche sync-matches pour rafraîchir scores + points.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Durée d'un match (90' + mi-temps + arrêts) ~ 2h15.
const MATCH_DURATION_MS = (2 * 60 + 15) * 60 * 1000
const MAX_TRIGGERS = 3 // évite les cascades

Deno.serve(async () => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // match_date + 2h15 < now()  <=>  match_date < now() - 2h15
    const threshold = new Date(Date.now() - MATCH_DURATION_MS).toISOString()

    const { data: due, error } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_date')
      .eq('status', 'scheduled')
      .lt('match_date', threshold)
      .order('match_date', { ascending: true })
      .limit(MAX_TRIGGERS)
    if (error) throw error

    let triggered = 0
    if (due?.length) {
      const fnUrl = `${SUPABASE_URL}/functions/v1/sync-matches`
      for (const _m of due) {
        await fetch(fnUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${SERVICE_KEY}` },
        })
        triggered++
      }
    }

    console.log(`trigger-match-sync: ${due?.length ?? 0} match(s) à finaliser, ${triggered} sync(s) déclenchée(s)`)
    return Response.json({ ok: true, due: due?.length ?? 0, triggered })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
