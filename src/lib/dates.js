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
