import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Affichée quand l'utilisateur revient depuis le lien "mot de passe oublié".
export default function ResetPassword() {
  const { endRecovery } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('6 caractères minimum.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    setDone(true)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fiesta px-4">
      <div className="mb-6 text-center text-white">
        <div className="text-5xl">🔑</div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Nouveau mot de passe</h1>
      </div>

      {done ? (
        <div className="card w-full max-w-sm space-y-4 p-6 text-center">
          <p className="text-brand">✓ Mot de passe mis à jour !</p>
          <button
            className="btn-primary w-full"
            onClick={() => {
              endRecovery()
              navigate('/join')
            }}
          >
            Continuer
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirme le mot de passe</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? '...' : 'Valider'}
          </button>
        </form>
      )}
    </div>
  )
}
