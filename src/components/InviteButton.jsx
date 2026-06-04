import { useState } from 'react'

const APP_URL = 'https://cdm26-rose.vercel.app'

// Bouton d'invitation : Web Share natif sur mobile, sinon copie dans le presse-papier.
export default function InviteButton({ code, className = '' }) {
  const [copied, setCopied] = useState(false)

  const link = `${APP_URL}/join?code=${code}`
  const message =
    `⚽ Rejoins mon groupe de pronos pour la Coupe du Monde 2026 sur CDM26 !\n` +
    `Code du groupe : ${code}\n` +
    `👉 ${link}`

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'CDM26 — Pronostics', text: message, url: link })
      } catch {
        /* partage annulé */
      }
    } else {
      try {
        await navigator.clipboard.writeText(message)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        /* clipboard indisponible */
      }
    }
  }

  return (
    <button onClick={share} className={`btn-outline ${className}`}>
      {copied ? '✓ Invitation copiée !' : '📤 Inviter des amis'}
    </button>
  )
}
