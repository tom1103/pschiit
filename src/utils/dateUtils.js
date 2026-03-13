/**
 * Formate un objet Date en une chaîne de caractères de temps lisible (HH:MM) au format fr-FR.
 * @param {Date|null|undefined} date - L'objet Date à formater.
 * @returns {string} L'heure formatée ou une chaîne vide si la date est invalide.
 */
export const formatTime = (date) => {
  if (!date) return ''
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
