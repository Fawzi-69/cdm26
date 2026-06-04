import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'

const SEEN_KEY = 'cdm26_welcome_seen'

// Message de bienvenue affiché une seule fois (1er passage dans un groupe).
export default function WelcomeModal() {
  const { user } = useAuth()
  const { group } = useGroup()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (user && group && localStorage.getItem(SEEN_KEY) !== '1') {
      setShow(true)
    }
  }, [user, group])

  if (!show) return null

  const close = () => {
    localStorage.setItem(SEEN_KEY, '1')
    setShow(false)
  }

  const Rule = ({ icon, children }) => (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-lg">{icon}</span>
      <span>{children}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative w-full max-w-sm animate-fadeIn rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="text-5xl">🏆</div>
        <h2 className="mt-2 text-2xl font-extrabold text-brand">Bienvenue sur CDM26 !</h2>
        <p className="mt-1 text-sm text-slate-500">Pronostics entre amis · Coupe du Monde 2026</p>

        <div className="mt-4 space-y-2 text-left text-sm">
          <p className="font-semibold text-slate-700">Comment marquer des points :</p>
          <Rule icon="✅">
            Bon résultat <b>1/N/2</b> → <b className="text-brand">1 pt</b>
          </Rule>
          <Rule icon="🎯">
            Score exact → <b className="text-brand">3 pts</b>
          </Rule>
          <Rule icon="🥇">
            Ton champion gagne la CdM → <b className="text-brand">+10 pts</b>
          </Rule>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Pronostique avant le coup d'envoi — un prono validé est définitif.
        </p>

        <button onClick={close} className="btn-primary mt-4 w-full">
          C'est parti ! ⚽
        </button>
      </div>
    </div>
  )
}
