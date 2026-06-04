import { useState } from 'react'

// Bouton d'invitation : Web Share natif sur mobile, sinon copie dans le presse-papier.
export default function InviteButton({ code, className = '' }) {
  const [copied, setCopied] = useState(false)

  // L'URL ne doit apparaître qu'UNE seule fois dans le message.
  const message =
    `⚽ Rejoins mon groupe de pronos CDM26 !\n` +
    `Code : ${code}\n` +
    `👉 cdm26-rose.vercel.app/join?code=${code}`

  async function share() {
    if (navigator.share) {
      try {
        // pas de champ `url` séparé -> évite le doublon d'URL (déjà dans le texte)
        await navigator.share({ text: message })
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
