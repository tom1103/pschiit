/**
 * @description Formate un objet Date en une chaîne de caractères de temps lisible (HH:MM).
 * @param {Date|null|undefined} date - L'objet Date à formater.
 * @returns {string} L'heure formatée ou une chaîne vide si la date est invalide.
 */
export const formatTime = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
