import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { flagUrl, NATIONS } from '../lib/nations'

const labelOf = (p) => (p === 'home' ? '1' : p === 'away' ? '2' : 'N')

function Outcome({ bet, match }) {
  if (match.status !== 'finished' || bet.points_earned == null) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">En attente</span>
  }
  const pts = Number(bet.points_earned)
  const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700' : pts >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {pts} pt{pts > 1 ? 's' : ''}
    </span>
  )
}

export default function MyBets() {
  const { user } = useAuth()
  const { group } = useGroup()
  const [bets, setBets] = useState([])
  const [winnerBet, setWinnerBet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !group) return
    ;(async () => {
      const { data } = await supabase
        .from('bets')
        .select('*, matches(*)')
        .eq('user_id', user.id)
        .eq('group_id', group.id)
        .order('created_at', { ascending: false })
      setBets(data ?? [])

      const { data: wb } = await supabase
        .from('tournament_winner_bets')
        .select('*')
        .eq('user_id', user.id)
        .eq('group_id', group.id)
        .maybeSingle()
      setWinnerBet(wb)
      setLoading(false)
    })()
  }, [user, group])

  const totalEarned = bets.reduce((s, b) => s + Number(b.points_earned || 0), 0) +
    Number(winnerBet?.points_earned || 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Mes paris</h2>
        <span className="text-sm text-slate-500">
          Total gagné : <b className="text-brand">{totalEarned} pts</b>
        </span>
      </div>

      {/* Pari vainqueur */}
      {winnerBet && (
        <div className="card flex items-center gap-3 border-l-4 border-amber-400 p-4">
          <span className="text-2xl">🏆</span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Vainqueur du tournoi
            </p>
            <p className="flex items-center gap-2 font-bold">
              {(() => {
                const n = NATIONS.find((x) => x.name === winnerBet.team)
                return n ? <img src={flagUrl(n.code)} alt="" className="h-4 w-6 rounded-sm object-cover" /> : null
              })()}
              {winnerBet.team}
            </p>
          </div>
          {winnerBet.points_earned != null && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {Number(winnerBet.points_earned)} pts
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-slate-400">Chargement…</div>
      ) : bets.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <p className="text-3xl">🎯</p>
          <p className="mt-2">Tu n'as pas encore parié. Direction les matchs !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bets.map((b) => {
            const m = b.matches
            return (
              <div key={b.id} className="card flex items-center gap-3 p-3">
                <div className="flex flex-1 items-center gap-2 text-sm">
                  <img src={flagUrl(m.home_flag)} alt="" className="h-4 w-6 rounded-sm object-cover" onError={(e) => (e.target.style.display = 'none')} />
                  <span className="font-medium">{m.home_team}</span>
                  <span className="text-slate-400">
                    {m.status === 'finished' ? `${m.home_score}-${m.away_score}` : 'vs'}
                  </span>
                  <span className="font-medium">{m.away_team}</span>
                  <img src={flagUrl(m.away_flag)} alt="" className="h-4 w-6 rounded-sm object-cover" onError={(e) => (e.target.style.display = 'none')} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    Pari : <b>{labelOf(b.prediction)}</b> · {b.predicted_home_score}-{b.predicted_away_score}
                  </p>
                  <Outcome bet={b} match={m} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
