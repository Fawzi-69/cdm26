import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import MatchCard from '../components/MatchCard'
import TournamentWinnerBanner from '../components/TournamentWinnerBanner'

export default function Dashboard() {
  const { user } = useAuth()
  const { group } = useGroup()
  const [matches, setMatches] = useState([])
  const [myBets, setMyBets] = useState({}) // match_id -> bet
  const [tournamentStarted, setTournamentStarted] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !group) return
    setLoading(true)

    const nowIso = new Date().toISOString()

    // Le tournoi a-t-il commencé ? (un match passé ou en cours existe)
    const { count: startedCount } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .lte('match_date', nowIso)
    setTournamentStarted((startedCount ?? 0) > 0)

    // 6 prochains matchs à venir (à défaut, on prend les plus proches)
    const { data: upcoming } = await supabase
      .from('matches')
      .select('*')
      .gte('match_date', nowIso)
      .order('match_date', { ascending: true })
      .limit(6)

    const list = upcoming ?? []
    setMatches(list)

    // Mes paris pour ces matchs
    if (list.length) {
      const { data: bets } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .eq('group_id', group.id)
        .in('match_id', list.map((m) => m.id))
      const map = {}
      for (const b of bets ?? []) map[b.match_id] = b
      setMyBets(map)
    } else {
      setMyBets({})
    }
    setLoading(false)
  }, [user, group])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <TournamentWinnerBanner tournamentStarted={tournamentStarted} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Prochains matchs</h2>
        <button onClick={load} className="text-sm font-medium text-brand">
          ↻ Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-400">Chargement…</div>
      ) : matches.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <p className="text-3xl">📅</p>
          <p className="mt-2 font-medium">Aucun match à venir pour le moment.</p>
          <p className="text-sm text-slate-400">
            Les matchs apparaîtront après la synchronisation de l'API (Edge Function sync-matches).
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => {
            const locked = new Date(m.match_date) <= new Date() || m.status !== 'scheduled'
            return (
              <MatchCard
                key={m.id}
                match={m}
                bet={myBets[m.id] || null}
                locked={locked}
                onBetPlaced={load}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
