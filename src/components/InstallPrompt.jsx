import { useEffect, useState } from 'react'

const DISMISS_KEY = 'cdm26_install_dismissed'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

// Icône "Partager" iOS (carré + flèche vers le haut)
function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-text-bottom"
    >
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    // Déjà installée ou déjà refusée -> on ne propose jamais
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return

    const onBIP = (e) => {
      e.preventDefault() // garde la main pour déclencher le prompt nous-mêmes
      setDeferred(e)
    }
    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, '1')
      setShow(false)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)

    setIos(isIOS())
    const t = setTimeout(() => setShow(true), 2000) // après 2 s sur la page

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(t)
    }
  }, [])

  if (!show) return null
  // Android/desktop : on attend le prompt natif. iOS : pas de prompt -> instructions.
  if (!ios && !deferred) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    localStorage.setItem(DISMISS_KEY, '1')
    setDeferred(null)
    setShow(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />
      <div className="relative w-full max-w-md animate-fadeIn rounded-t-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="CDM26" className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <p className="font-bold">📲 Installe CDM26</p>
            <p className="text-sm text-slate-500">
              Sur ton téléphone, pour un accès rapide sans navigateur.
            </p>
          </div>
        </div>

        {ios ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            Sur iPhone : appuie sur le bouton Partager <ShareIcon /> en bas de Safari, puis choisis{' '}
            <b>« Sur l'écran d'accueil »</b>.
            <button onClick={dismiss} className="btn-outline mt-3 w-full !py-2 text-sm">
              J'ai compris
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button onClick={dismiss} className="btn-outline flex-1 !py-2.5 text-sm">
              Plus tard
            </button>
            <button onClick={install} className="btn-primary flex-1 !py-2.5 text-sm">
              Installer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
