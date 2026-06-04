import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { flagUrl } from '../lib/nations'

const RESULTS = [
  { key: 'home', label: '1' },
  { key: 'draw', label: 'N' },
  { key: 'away', label: '2' },
]

function Flag({ code, name }) {
  if (!code) return <span className="text-2xl">🏳️</span>
  return (
    <img
      src={flagUrl(code)}
      alt={name}
      className="h-6 w-9 rounded-sm object-cover shadow-sm"
      loading="lazy"
    />
  )
}

const labelOf = (p) => (p === 'home' ? '1' : p === 'away' ? '2' : 'N')

// Bloc dépliable : ce qu'ont voté les amis du groupe sur ce match.
function FriendsVotes({ votes }) {
  const [open, setOpen] = useState(false)
  if (!votes?.length) return null
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-semibold text-slate-500"
      >
        <span>👥 Votes des amis ({votes.length})</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {votes.map((v) => (
            <li
              key={v.id}
              className={`flex items-center justify-between rounded-lg px-2 py-1 text-sm ${
                v.isMe ? 'bg-brand/5' : ''
              }`}
            >
              <span className="truncate">
                {v.username} {v.isMe && <span className="text-[11px] text-brand">(toi)</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold">
                  {labelOf(v.prediction)}
                </span>
                <span className="text-xs text-slate-500">
                  {v.predicted_home_score}-{v.predicted_away_score}
                </span>
                {v.points_earned != null && (
                  <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand">
                    {Number(v.points_earned)} pt
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// `match` : ligne matches. `bet` : prono existant (ou null). `locked` : match commencé.
// `votes` : pronos de tous les membres du groupe sur ce match.
export default function MatchCard({ match, bet, locked, votes = [], onBetPlaced }) {
  const { user } = useAuth()
  const { group } = useGroup()
  const [prediction, setPrediction] = useState(bet?.prediction || '')
  const [homeScore, setHomeScore] = useState(bet?.predicted_home_score ?? '')
  const [awayScore, setAwayScore] = useState(bet?.predicted_away_score ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submitted = Boolean(bet)
  const disabled = submitted || locked

  const odds = {
    home: match.home_odds,
    draw: match.draw_odds,
    away: match.away_odds,
  }

  const time = new Date(match.match_date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // déduit le résultat depuis le score saisi pour cohérence visuelle
  function onScoreChange(h, a) {
    setHomeScore(h)
    setAwayScore(a)
    if (h !== '' && a !== '') {
      const hi = Number(h)
      const ai = Number(a)
      setPrediction(hi > ai ? 'home' : hi < ai ? 'away' : 'draw')
    }
  }

  async function submit() {
    if (!prediction || homeScore === '' || awayScore === '') {
      setError('Choisis un résultat et un score exact.')
      return
    }
    setBusy(true)
    setError('')
    const oddsAtBet =
      prediction === 'home' ? odds.home : prediction === 'away' ? odds.away : odds.draw
    const { error } = await supabase.from('bets').insert({
      user_id: user.id,
      group_id: group.id,
      match_id: match.id,
      prediction,
      predicted_home_score: Number(homeScore),
      predicted_away_score: Number(awayScore),
      odds_at_bet: oddsAtBet ?? null,
    })
    setBusy(false)
    if (error) {
      setError(error.code === '23505' ? 'Prono déjà enregistré.' : error.message)
    } else {
      onBetPlaced?.()
    }
  }

  return (
    <div className="card p-4">
      {/* En-tête : stage + heure */}
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span className="truncate">{match.stage || 'Coupe du Monde 2026'}</span>
        <span className="font-medium text-slate-500">
          {locked ? (match.status === 'finished' ? 'Terminé' : 'En cours') : time}
        </span>
      </div>

      {/* Équipes */}
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 justify-self-start">
          <Flag code={match.home_flag} name={match.home_team} />
          <span className="font-semibold">{match.home_team}</span>
        </div>
        <span className="text-sm font-bold text-slate-400">
          {match.status === 'finished' || match.status === 'live'
            ? `${match.home_score ?? 0} - ${match.away_score ?? 0}`
            : 'vs'}
        </span>
        <div className="flex items-center gap-2 justify-self-end">
          <span className="font-semibold">{match.away_team}</span>
          <Flag code={match.away_flag} name={match.away_team} />
        </div>
      </div>

      {/* Boutons résultat 1/N/2 avec cote (secondaire) */}
      <div className="grid grid-cols-3 gap-2">
        {RESULTS.map((r) => {
          const active = prediction === r.key
          return (
            <button
              key={r.key}
              type="button"
              disabled={disabled}
              onClick={() => setPrediction(r.key)}
              className={`flex flex-col items-center rounded-xl border-2 py-2 transition ${
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-200 text-slate-700 hover:border-brand'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <span className="text-lg font-bold">{r.label}</span>
              <span className={`text-[11px] ${active ? 'text-white/80' : 'text-slate-400'}`}>
                {odds[r.key] ? `cote ${Number(odds[r.key]).toFixed(2)}` : '—'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Score exact */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="text-xs text-slate-400">Score exact</span>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          disabled={disabled}
          value={homeScore}
          onChange={(e) => onScoreChange(e.target.value, awayScore)}
          className="input w-16 text-center"
          placeholder="0"
        />
        <span className="font-bold text-slate-400">-</span>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          disabled={disabled}
          value={awayScore}
          onChange={(e) => onScoreChange(homeScore, e.target.value)}
          className="input w-16 text-center"
          placeholder="0"
        />
      </div>

      {/* Action */}
      <div className="mt-3">
        {submitted ? (
          <p className="rounded-xl bg-brand/10 py-2 text-center text-sm font-semibold text-brand">
            ✓ Prono verrouillé : {bet.prediction === 'home' ? '1' : bet.prediction === 'away' ? '2' : 'N'} ·{' '}
            {bet.predicted_home_score}-{bet.predicted_away_score}
            {bet.points_earned != null && ` · ${bet.points_earned} pt(s)`}
          </p>
        ) : locked ? (
          <p className="py-2 text-center text-sm text-slate-400">Pronos fermés</p>
        ) : (
          <button className="btn-primary w-full" disabled={busy} onClick={submit}>
            {busy ? '...' : 'Valider mon prono'}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}

      <FriendsVotes votes={votes} />
    </div>
  )
}
