import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import InviteButton from '../components/InviteButton'

export default function Join() {
  const { user } = useAuth()
  const { group, refreshGroup } = useGroup()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Code pré-rempli via lien d'invitation (/join?code=XXXXXX)
  const invitedCode = (searchParams.get('code') || '').toUpperCase()

  const defaultUsername = user?.user_metadata?.username || ''
  const [tab, setTab] = useState('join') // 'join' | 'create'
  const [username, setUsername] = useState(defaultUsername)
  const [code, setCode] = useState(invitedCode)
  const [groupName, setGroupName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [createdCode, setCreatedCode] = useState('')

  async function handleJoin(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('join_group', {
        p_code: code.trim().toUpperCase(),
        p_username: username.trim(),
      })
      if (error) throw error
      await refreshGroup(data.id)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Impossible de rejoindre le groupe')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('create_group', {
        p_name: groupName.trim(),
        p_username: username.trim(),
      })
      if (error) throw error
      setCreatedCode(data.code)
      await refreshGroup(data.id)
    } catch (err) {
      setError(err.message || 'Impossible de créer le groupe')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-brand">Ton groupe de pronos</h1>
        <p className="text-sm text-slate-500">
          Crée un groupe et partage le code, ou rejoins celui de tes amis.
        </p>
      </div>

      {group && !createdCode && (
        <div className="card border-l-4 border-brand p-4 text-sm">
          Tu es déjà dans <b>{group.name}</b> (code <span className="font-mono">{group.code}</span>).{' '}
          <button onClick={() => navigate('/dashboard')} className="font-semibold text-brand underline">
            Aller au tableau de bord
          </button>
        </div>
      )}

      {createdCode ? (
        <div className="card space-y-3 p-6 text-center">
          <p className="text-sm text-slate-500">Groupe créé ! Partage ce code :</p>
          <div className="rounded-xl bg-brand/10 py-4 text-4xl font-extrabold tracking-[0.3em] text-brand">
            {createdCode}
          </div>
          <InviteButton code={createdCode} className="w-full" />
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
            Commencer à pronostiquer
          </button>
        </div>
      ) : (
        <div className="card p-6">
          <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
            {[
              ['join', 'Rejoindre'],
              ['create', 'Créer'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => {
                  setTab(k)
                  setError('')
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  tab === k ? 'bg-white text-brand shadow' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Ton pseudo</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pseudo affiché dans le classement"
              maxLength={20}
              required
            />
          </div>

          {tab === 'join' ? (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Code du groupe</label>
                <input
                  className="input text-center font-mono text-lg uppercase tracking-[0.3em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  maxLength={6}
                  required
                />
              </div>
              <button className="btn-primary w-full" disabled={busy || !username.trim()}>
                {busy ? '...' : 'Rejoindre'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nom du groupe</label>
                <input
                  className="input"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Les potes du foot"
                  maxLength={40}
                  required
                />
              </div>
              <button className="btn-primary w-full" disabled={busy || !username.trim()}>
                {busy ? '...' : 'Créer le groupe'}
              </button>
            </form>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
