import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/join')
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setInfo('Si un compte existe, un email de réinitialisation vient de partir. Vérifie ta boîte mail.')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        })
        if (error) throw error
        // Confirmation email désactivée -> session immédiate, on enchaîne
        navigate('/join')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/join')
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fiesta px-4">
      <div className="mb-6 text-center text-white drop-shadow">
        <div className="text-5xl">⚽</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">CDM26</h1>
        <p className="text-white/90">Pronostics entre amis · Coupe du Monde 2026</p>
      </div>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-slate-100 p-1">
            {['signin', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m ? 'bg-white text-brand shadow' : 'text-slate-500'
                }`}
              >
                {m === 'signin' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>
        )}

        {mode === 'forgot' && (
          <p className="text-sm font-semibold text-brand">Réinitialiser le mot de passe</p>
        )}

        {mode === 'signup' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Pseudo</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ton pseudo dans le groupe"
              required
              maxLength={20}
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@email.com"
            required
          />
        </div>

        {mode !== 'forgot' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Mot de passe</label>
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
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-brand">{info}</p>}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy
            ? '...'
            : mode === 'forgot'
              ? 'Envoyer le lien'
              : mode === 'signin'
                ? 'Se connecter'
                : "S'inscrire"}
        </button>

        {mode === 'signin' && (
          <button
            type="button"
            onClick={() => {
              setMode('forgot')
              setError('')
              setInfo('')
            }}
            className="w-full text-center text-sm text-slate-500 hover:text-brand"
          >
            Mot de passe oublié ?
          </button>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setError('')
              setInfo('')
            }}
            className="w-full text-center text-sm text-slate-500 hover:text-brand"
          >
            ← Retour à la connexion
          </button>
        )}
      </form>
    </div>
  )
}
