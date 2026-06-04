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
  const [finished, setFinished] = useState([])
  const [myBets, setMyBets] = useState({}) // match_id -> mon prono
  const [votesByMatch, setVotesByMatch] = useState({}) // match_id -> [votes des amis]
  const [tournamentStarted, setTournamentStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    if (!user || !group) return
    setLoading(true)
    setLoadError(false)

    try {
      const nowIso = new Date().toISOString()

      // Le tournoi a-t-il commencé ? (un match passé ou en cours existe)
      const { count: startedCount, error: e0 } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .lte('match_date', nowIso)
      if (e0) throw e0
      setTournamentStarted((startedCount ?? 0) > 0)

      // 6 prochains matchs à venir
      const { data: upcoming, error: e1 } = await supabase
        .from('matches')
        .select('*')
        .gte('match_date', nowIso)
        .order('match_date', { ascending: true })
        .limit(6)
      if (e1) throw e1

      // Matchs récemment terminés (résultats + animations)
      const { data: done, error: e2 } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'finished')
        .order('match_date', { ascending: false })
        .limit(4)
      if (e2) throw e2

      const list = upcoming ?? []
      const doneList = done ?? []
      setMatches(list)
      setFinished(doneList)

      const allMatches = [...list, ...doneList]
      if (allMatches.length) {
        const ids = allMatches.map((m) => m.id)

        // Pseudos des membres du groupe (pour afficher les votes)
        const { data: members, error: e3 } = await supabase
          .from('group_members')
          .select('user_id, username')
          .eq('group_id', group.id)
        if (e3) throw e3
        const nameById = {}
        for (const m of members ?? []) nameById[m.user_id] = m.username

        // TOUS les pronos du groupe sur ces matchs (visibles entre amis)
        const { data: allBets, error: e4 } = await supabase
          .from('bets')
          .select('*')
          .eq('group_id', group.id)
          .in('match_id', ids)
        if (e4) throw e4

        const mine = {}
        const votes = {}
        for (const b of allBets ?? []) {
          if (b.user_id === user.id) mine[b.match_id] = b
          ;(votes[b.match_id] ||= []).push({
            ...b,
            username: nameById[b.user_id] || 'Joueur',
            isMe: b.user_id === user.id,
          })
        }
        // mes votes en premier, puis par pseudo
        for (const k of Object.keys(votes)) {
          votes[k].sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0) || a.username.localeCompare(b.username))
        }
        setMyBets(mine)
        setVotesByMatch(votes)
      } else {
        setMyBets({})
        setVotesByMatch({})
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [user, group])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <TournamentWinnerBanner tournamentStarted={tournamentStarted} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Prochains matchs</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium text-brand disabled:opacity-60"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          ) : (
            '↻'
          )}
          Rafraîchir
        </button>
      </div>

      {loadError ? (
        <div className="card p-8 text-center">
          <p className="text-3xl">📡</p>
          <p className="mt-2 font-medium text-slate-700">Erreur de connexion</p>
          <p className="text-sm text-slate-400">Impossible de charger les matchs.</p>
          <button onClick={load} disabled={loading} className="btn-primary mt-4">
            {loading ? '...' : 'Réessayer'}
          </button>
        </div>
      ) : loading ? (
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
        <div className="grid gap-2.5 sm:grid-cols-2">
          {matches.map((m) => {
            const locked = new Date(m.match_date) <= new Date() || m.status !== 'scheduled'
            return (
              <MatchCard
                key={m.id}
                match={m}
                bet={myBets[m.id] || null}
                votes={votesByMatch[m.id] || []}
                locked={locked}
                onBetPlaced={load}
              />
            )
          })}
        </div>
      )}

      {!loading && finished.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-lg font-bold">Résultats récents</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {finished.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                bet={myBets[m.id] || null}
                votes={votesByMatch[m.id] || []}
                locked
                onBetPlaced={load}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
