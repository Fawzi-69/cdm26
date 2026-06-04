import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { user } = useAuth()
  const { group } = useGroup()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!group) return
    const { data } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id)
      .order('total_points', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [group])

  useEffect(() => {
    load()
    if (!group) return

    // Temps réel : toute modif de total_points dans ce groupe rafraîchit
    const channel = supabase
      .channel(`leaderboard-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${group.id}`,
        },
        () => load(),
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [group, load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Classement · {group?.name}</h2>
        <span className="flex items-center gap-1 text-xs text-brand">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> live
        </span>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-400">Chargement…</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {rows.map((r, i) => {
            const me = r.user_id === user?.id
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 px-4 py-3 ${me ? 'bg-brand/5' : ''}`}
              >
                <div className="w-8 text-center text-lg font-bold">
                  {MEDALS[i] || <span className="text-slate-400">{i + 1}</span>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {r.username} {me && <span className="text-xs text-brand">(toi)</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-brand">
                    {Number(r.total_points || 0)}
                  </p>
                  <p className="text-[11px] text-slate-400">pts</p>
                </div>
              </div>
            )
          })}
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-400">Aucun membre pour l'instant.</p>
          )}
        </div>
      )}

      <p className="px-1 text-center text-xs text-slate-400">
        Barème : bon résultat 1/N/2 = 1 pt · score exact = 3 pts · vainqueur de la CdM = 10 pts.
      </p>
    </div>
  )
}
