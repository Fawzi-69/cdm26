import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { flagUrl } from '../lib/nations'

const RESULTS = [
  { key: 'home', label: '1' },
  { key: 'draw', label: 'N' },
  { key: 'away', label: '2' },
]
const labelOf = (p) => (p === 'home' ? '1' : p === 'away' ? '2' : 'N')

function Flag({ code, name }) {
  if (!code) return <span className="text-lg">🏳️</span>
  return (
    <img
      src={flagUrl(code)}
      alt={name}
      className="h-5 w-8 rounded-sm object-cover shadow-sm"
      loading="lazy"
    />
  )
}

// Sélecteur de score compact avec boutons +/- (min 0, max 20).
function Stepper({ value, onChange }) {
  const v = value === '' ? 0 : Number(value)
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, v - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-base font-bold leading-none text-slate-600 active:scale-95"
      >
        −
      </button>
      <span className="w-5 text-center text-base font-bold tabular-nums">{v}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, v + 1))}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-base font-bold leading-none text-slate-600 active:scale-95"
      >
        +
      </button>
    </div>
  )
}

// Bloc dépliable : ce qu'ont voté les amis du groupe sur ce match.
function FriendsVotes({ votes }) {
  const [open, setOpen] = useState(false)
  if (!votes?.length) return null
  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-500"
      >
        <span>👥 Votes des amis ({votes.length})</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {votes.map((v) => (
            <li
              key={v.id}
              className={`flex items-center justify-between rounded-lg px-2 py-1 text-[13px] ${
                v.isMe ? 'bg-brand/5' : ''
              }`}
            >
              <span className="truncate">
                {v.username} {v.isMe && <span className="text-[10px] text-brand">(toi)</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold">
                  {labelOf(v.prediction)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {v.predicted_home_score}-{v.predicted_away_score}
                </span>
                {v.points_earned != null && (
                  <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
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
  const cardRef = useRef(null)
  const [prediction, setPrediction] = useState(bet?.prediction || '')
  const [homeScore, setHomeScore] = useState(bet?.predicted_home_score ?? 0)
  const [awayScore, setAwayScore] = useState(bet?.predicted_away_score ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submitted = Boolean(bet)
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const disabled = submitted || locked

  const odds = { home: match.home_odds, draw: match.draw_odds, away: match.away_odds }
  const time = new Date(match.match_date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const realResult = isFinished
    ? match.home_score > match.away_score
      ? 'home'
      : match.home_score < match.away_score
        ? 'away'
        : 'draw'
    : null

  const myPts = bet?.points_earned
  const correct = isFinished && myPts != null && Number(myPts) > 0
  const exact = isFinished && Number(myPts) === 3
  const wrong = isFinished && bet && myPts != null && Number(myPts) === 0

  // Confetti léger (2 s) une seule fois quand le prono se révèle correct.
  useEffect(() => {
    if (!correct || !bet) return
    const key = `cdm26_celebrated_${bet.id}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')

    const rect = cardRef.current?.getBoundingClientRect()
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.4 }

    const end = Date.now() + 2000
    const colors = ['#7c3aed', '#db2777', '#f59e0b', '#22c55e', '#ffffff']
    const interval = setInterval(() => {
      if (!window.confetti || Date.now() > end) {
        clearInterval(interval)
        return
      }
      window.confetti({
        particleCount: exact ? 6 : 3,
        spread: 55,
        startVelocity: 22,
        scalar: 0.7,
        gravity: 0.9,
        ticks: 120,
        origin,
        colors,
      })
    }, 200)
    return () => clearInterval(interval)
  }, [correct, exact, bet])

  function updateScore(h, a) {
    setHomeScore(h)
    setAwayScore(a)
    setPrediction(h > a ? 'home' : h < a ? 'away' : 'draw')
  }

  async function submit() {
    if (!prediction) {
      setError('Choisis un résultat.')
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
    if (error) setError(error.code === '23505' ? 'Prono déjà enregistré.' : error.message)
    else onBetPlaced?.()
  }

  return (
    <div ref={cardRef} className="card p-3">
      {/* En-tête : stage + statut */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-slate-400">{match.stage || 'CdM 2026'}</span>
        {isFinished ? (
          <span className="shrink-0 text-[12px] text-slate-400">Terminé</span>
        ) : isLive ? (
          <span className="shrink-0 text-[11px] font-semibold text-brand">● En cours</span>
        ) : (
          <span className="shrink-0 text-[11px] font-medium text-slate-500">{time}</span>
        )}
      </div>

      {/* Équipes + score */}
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-1.5 justify-self-start">
          <Flag code={match.home_flag} name={match.home_team} />
          <span className="truncate text-sm font-semibold">{match.home_team}</span>
        </div>
        <div className="px-1 text-center">
          {isFinished || isLive ? (
            <span className="text-xl font-bold tabular-nums text-brand-dark">
              {match.home_score ?? 0}-{match.away_score ?? 0}
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-300">vs</span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 justify-self-end">
          <span className="truncate text-right text-sm font-semibold">{match.away_team}</span>
          <Flag code={match.away_flag} name={match.away_team} />
        </div>
      </div>

      {/* Boutons résultat 1/N/2 (h 52px) — cote secondaire dessous */}
      <div className="grid grid-cols-3 gap-1.5">
        {RESULTS.map((r) => {
          const userPicked = prediction === r.key
          const isReal = isFinished && realResult === r.key
          let cls
          if (isFinished) {
            if (isReal) cls = 'border-brand-dark bg-brand-dark text-white'
            else if (userPicked) cls = 'border-red-200 text-red-400'
            else cls = 'border-slate-100 text-slate-300'
          } else if (userPicked) {
            cls = 'border-brand bg-brand text-white'
          } else {
            cls = 'border-slate-200 text-slate-700 hover:border-brand'
          }
          return (
            <button
              key={r.key}
              type="button"
              disabled={disabled || isFinished}
              onClick={() => !disabled && setPrediction(r.key)}
              style={{ height: '52px' }}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 transition ${cls} ${
                disabled || isFinished ? 'cursor-default' : ''
              }`}
            >
              <span className="flex items-center gap-1 text-base font-bold leading-none">
                {r.label}
                {isReal && <span className="animate-checkPop">✓</span>}
              </span>
              <span
                className={`text-[10px] ${userPicked && !isFinished ? 'text-white/80' : 'text-slate-400'}`}
              >
                {odds[r.key] ? Number(odds[r.key]).toFixed(2) : '—'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Score exact compact (steppers, ≤40px) — uniquement en mode pari ouvert */}
      {!disabled && (
        <div className="mt-2 flex h-9 items-center justify-center gap-2">
          <span className="text-[11px] text-slate-400">Score</span>
          <Stepper value={homeScore} onChange={(v) => updateScore(v, awayScore)} />
          <span className="text-base font-bold text-slate-400">-</span>
          <Stepper value={awayScore} onChange={(v) => updateScore(homeScore, v)} />
        </div>
      )}

      {/* Action / résultat */}
      <div className="mt-2">
        {isFinished ? (
          bet ? (
            correct ? (
              <div className="flex animate-fadeIn flex-wrap items-center justify-center gap-2">
                <span className="rounded-lg bg-brand/10 px-2 py-1 text-sm font-semibold text-brand">
                  ✓ Correct · +{Number(myPts)} pts
                </span>
                {exact && (
                  <span className="animate-bounceIn rounded-lg bg-amber-100 px-2 py-1 text-sm font-bold text-amber-600">
                    🎯 Score exact !
                  </span>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-red-400">✗ Incorrect · 0 pt</p>
            )
          ) : (
            <p className="text-center text-xs text-slate-400">Non pronostiqué</p>
          )
        ) : submitted ? (
          <p className="rounded-lg bg-brand/10 py-1.5 text-center text-xs font-semibold text-brand">
            ✓ Prono verrouillé : {labelOf(bet.prediction)} · {bet.predicted_home_score}-
            {bet.predicted_away_score}
          </p>
        ) : locked ? (
          <p className="py-1.5 text-center text-xs text-slate-400">Pronos fermés</p>
        ) : (
          <button className="btn-primary w-full !py-2 text-sm" disabled={busy} onClick={submit}>
            {busy ? '...' : 'Valider mon prono'}
          </button>
        )}
      </div>

      {error && <p className="mt-1.5 text-center text-xs text-red-600">{error}</p>}

      <FriendsVotes votes={votes} />
    </div>
  )
}
