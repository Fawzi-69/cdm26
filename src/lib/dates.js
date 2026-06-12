// Début de la phase à élimination directe (16es de finale, 28 juin 2026).
// Le prono "vainqueur du tournoi" reste ouvert jusqu'à cette date.
export const KNOCKOUT_START = new Date('2026-06-28T00:00:00Z')

// Format d'affichage unique pour les dates/heures de match, en heure de Paris.
export function formatMatchDate(date) {
  return new Date(date).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
