import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { NATIONS, flagUrl } from '../lib/nations'

// Bandeau "Prono vainqueur" : ouvert jusqu'au début de la phase à élimination directe.
// Immuable une fois soumis.
export default function TournamentWinnerBanner({ knockoutStarted }) {
  const { user } = useAuth()
  const { group } = useGroup()
  const [existing, setExisting] = useState(null)
  const [team, setTeam] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !group) return
    supabase
      .from('tournament_winner_bets')
      .select('*')
      .eq('user_id', user.id)
      .eq('group_id', group.id)
      .maybeSingle()
      .then(({ data }) => setExisting(data))
  }, [user, group])

  async function submit() {
    if (!team) return
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('tournament_winner_bets')
      .insert({ user_id: user.id, group_id: group.id, team })
      .select()
      .single()
    setBusy(false)
    if (error) setError(error.message)
    else setExisting(data)
  }

  // Déjà soumis -> une seule ligne compacte
  if (existing) {
    const nation = NATIONS.find((n) => n.name === existing.team)
    return (
      <div
        className="card flex items-center gap-2 border-l-4 border-amber-400 p-2.5 text-sm"
        title="+10 pts si ton champion gagne la CdM"
      >
        <span style={{ fontSize: '24px' }} className="leading-none">
          🏆
        </span>
        {nation && (
          <img src={flagUrl(nation.code)} alt="" className="h-4 w-6 rounded-sm object-cover" />
        )}
        <span className="font-bold">{existing.team}</span>
        <span className="text-xs text-slate-400">(verrouillé)</span>
      </div>
    )
  }

  // Phase à élimination directe commencée et pas de prono -> trop tard
  if (knockoutStarted) {
    return (
      <div className="card border-l-4 border-slate-300 p-2.5 text-sm text-slate-500">
        🏆 Prono vainqueur fermé (la phase à élimination directe a commencé).
      </div>
    )
  }

  // Formulaire de prono (compact)
  return (
    <div className="card space-y-2 border-l-4 border-amber-400 p-2.5">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '24px' }} className="leading-none">
          🏆
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold">Prono vainqueur du tournoi</p>
          <p className="text-[11px] text-slate-500">
            Jusqu'aux 16es de finale (28 juin) · <b>+10 pts</b> s'il gagne · immuable
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <select
          className="input !py-2 text-sm"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        >
          <option value="">— Choisis une nation —</option>
          {NATIONS.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </select>
        <button
          className="btn-primary shrink-0 !py-2 text-sm"
          disabled={!team || busy}
          onClick={submit}
        >
          {busy ? '...' : 'Verrouiller'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
