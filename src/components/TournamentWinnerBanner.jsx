import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { NATIONS, flagUrl } from '../lib/nations'

// Bandeau "Pari vainqueur" : visible tant qu'aucun match n'a commencé.
// Immuable une fois soumis.
export default function TournamentWinnerBanner({ tournamentStarted }) {
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

  // Déjà soumis -> lecture seule
  if (existing) {
    const nation = NATIONS.find((n) => n.name === existing.team)
    return (
      <div className="card flex items-center gap-3 border-l-4 border-amber-400 p-4">
        <span className="text-2xl">🏆</span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Ton vainqueur de la CdM (verrouillé · +10 pts si correct)
          </p>
          <p className="flex items-center gap-2 text-lg font-bold">
            {nation && (
              <img src={flagUrl(nation.code)} alt="" className="h-4 w-6 rounded-sm object-cover" />
            )}
            {existing.team}
          </p>
        </div>
      </div>
    )
  }

  // Tournoi commencé et pas de pari -> trop tard
  if (tournamentStarted) {
    return (
      <div className="card border-l-4 border-slate-300 p-4 text-sm text-slate-500">
        🏆 Le pari "vainqueur du tournoi" est fermé (la compétition a commencé).
      </div>
    )
  }

  // Formulaire de pari
  return (
    <div className="card space-y-3 border-l-4 border-amber-400 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="font-bold">Pari vainqueur du tournoi</p>
          <p className="text-xs text-slate-500">
            Choisis ton champion avant le 1er match. <b>+10 pts</b> s'il gagne. Immuable.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select className="input" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">— Choisis une nation —</option>
          {NATIONS.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </select>
        <button className="btn-primary sm:w-40" disabled={!team || busy} onClick={submit}>
          {busy ? '...' : 'Verrouiller'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
