import { useEffect, useState } from 'react'

const ANDROID_DISMISS = 'cdm26_install_dismissed'
const IOS_DISMISS = 'pwa-dismissed'

const isIOSDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)
const isInStandaloneMode = () =>
  window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches

// Petite flèche "Partager" iOS (carré + flèche vers le haut)
function ShareArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-text-bottom text-brand"
    >
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}

// Schéma : barre Safari (bouton Partager) -> "Sur l'écran d'accueil"
function IOSDiagram() {
  return (
    <svg viewBox="0 0 320 92" className="w-full" xmlns="http://www.w3.org/2000/svg">
      {/* Barre Safari avec le bouton Partager */}
      <rect x="6" y="22" width="84" height="44" rx="12" fill="#f1f5f9" stroke="#cbd5e1" />
      <g
        transform="translate(36,32)"
        stroke="#15803d"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 16V5" />
        <path d="M8 9l4-4 4 4" />
        <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </g>
      <text x="48" y="84" textAnchor="middle" fontSize="11" fill="#64748b">Partager</text>

      {/* Flèche */}
      <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M98 44h18" />
        <path d="M110 38l6 6-6 6" />
      </g>

      {/* Ligne de menu "Sur l'écran d'accueil" */}
      <rect x="126" y="28" width="188" height="34" rx="9" fill="#ffffff" stroke="#cbd5e1" />
      <text x="138" y="49" fontSize="12" fill="#0f172a">Sur l'écran d'accueil</text>
      <rect x="286" y="35" width="20" height="20" rx="5" fill="none" stroke="#15803d" strokeWidth="2" />
      <path d="M296 39v12M290 45h12" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const iosDevice = isIOSDevice()
    setIos(iosDevice)

    // Déjà installée (standalone) -> rien
    if (isInStandaloneMode()) return
    // Déjà fermé -> rien (clé différente selon plateforme)
    if (iosDevice && localStorage.getItem(IOS_DISMISS) === 'true') return
    if (!iosDevice && localStorage.getItem(ANDROID_DISMISS) === '1') return

    // Android : on capture l'événement natif
    const onBIP = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      localStorage.setItem(ANDROID_DISMISS, '1')
      setShow(false)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)

    const t = setTimeout(() => setShow(true), 2000)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(t)
    }
  }, [])

  if (!show) return null
  // Android : on attend le prompt natif. iOS : pas de prompt -> instructions.
  if (!ios && !deferred) return null

  const dismissIOS = () => {
    localStorage.setItem(IOS_DISMISS, 'true')
    setShow(false)
  }
  const dismissAndroid = () => {
    localStorage.setItem(ANDROID_DISMISS, '1')
    setShow(false)
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    localStorage.setItem(ANDROID_DISMISS, '1')
    setDeferred(null)
    setShow(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={ios ? dismissIOS : dismissAndroid} />
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
          <div className="mt-3">
            <p className="text-sm text-slate-600">
              Pour installer CDM26 : appuie sur le bouton Partager <ShareArrowIcon /> en bas de
              Safari, puis « Sur l'écran d'accueil ».
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <IOSDiagram />
            </div>
            <button onClick={dismissIOS} className="btn-primary mt-4 w-full">
              OK compris
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button onClick={dismissAndroid} className="btn-outline flex-1 !py-2.5 text-sm">
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
