import SunCalc from 'suncalc'

/**
 * @description Noms des huit phases lunaires en français, ordonnés selon la valeur
 * « phase » renvoyée par SunCalc (0 = nouvelle lune, 0.5 = pleine lune, ~1 = retour à la nouvelle lune).
 * @type {string[]}
 */
const NOMS_PHASES_LUNE = [
  'Nouvelle lune',
  'Premier croissant',
  'Premier quartier',
  'Lune gibbeuse croissante',
  'Pleine lune',
  'Lune gibbeuse décroissante',
  'Dernier quartier',
  'Dernier croissant',
]

/**
 * @description Convertit la valeur continue de phase lunaire (0 à 1) de SunCalc
 * en nom de phase lisible en français.
 * @param {number} phase - Valeur de phase entre 0 et 1 (issue de SunCalc.getMoonIllumination).
 * @returns {string} Le nom de la phase lunaire correspondante.
 */
export const getMoonPhaseName = (phase) => {
  // On découpe le cycle lunaire en 8 secteurs égaux. Le décalage de 0.5 secteur
  // permet de centrer chaque nom de phase sur sa valeur de référence (ex. pleine lune à 0.5).
  const normalisee = ((phase % 1) + 1) % 1
  const index = Math.floor(normalisee * 8 + 0.5) % 8
  return NOMS_PHASES_LUNE[index]
}

/**
 * @description Calcule les informations de la phase lunaire pour une date donnée.
 * @param {Date} date - La date pour laquelle calculer la phase de la lune.
 * @returns {{name: string, illumination: number, phase: number}} Le nom de la phase,
 * le pourcentage d'illumination (0 à 100, arrondi) et la valeur brute de phase.
 */
export const getMoonPhaseInfo = (date) => {
  // Garde-fou : une date invalide renvoie des valeurs neutres plutôt que de planter.
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { name: '', illumination: 0, phase: 0 }
  }

  const { fraction, phase } = SunCalc.getMoonIllumination(date)
  return {
    name: getMoonPhaseName(phase),
    illumination: Math.round(fraction * 100),
    phase,
  }
}

/**
 * @description Calcule la durée du jour (intervalle entre le lever et le coucher du soleil)
 * à partir d'un résultat SunCalc.getTimes.
 * @param {{sunrise: Date, sunset: Date}} times - Objet contenant les heures de lever et de coucher.
 * @returns {{minutes: number, label: string}} La durée en minutes et son libellé formaté
 * (ex. « 14h 32min »). Renvoie une durée nulle et un libellé vide si les heures sont invalides
 * (cas des régions polaires où le soleil ne se lève/couche pas).
 */
export const getDayLength = (times) => {
  const sunrise = times?.sunrise
  const sunset = times?.sunset

  // En région polaire, SunCalc peut renvoyer des dates invalides (jour ou nuit permanents).
  if (
    !(sunrise instanceof Date) ||
    !(sunset instanceof Date) ||
    isNaN(sunrise.getTime()) ||
    isNaN(sunset.getTime())
  ) {
    return { minutes: 0, label: '' }
  }

  const dureeMs = sunset.getTime() - sunrise.getTime()
  // Une durée négative (coucher avant lever) n'a pas de sens ici : on la considère comme nulle.
  if (dureeMs <= 0) {
    return { minutes: 0, label: '' }
  }

  const minutesTotales = Math.round(dureeMs / 1000 / 60)
  const heures = Math.floor(minutesTotales / 60)
  const minutes = minutesTotales % 60
  return { minutes: minutesTotales, label: `${heures}h ${String(minutes).padStart(2, '0')}min` }
}

/**
 * @description Retourne une nouvelle chaîne de date (format YYYY-MM-DD) décalée d'un
 * nombre de jours donné par rapport à une date de départ. Utilisé pour la navigation
 * « jour précédent / suivant ».
 * @param {string} dateString - Date de départ au format YYYY-MM-DD.
 * @param {number} offset - Nombre de jours à ajouter (peut être négatif).
 * @returns {string} La nouvelle date au format YYYY-MM-DD.
 */
export const shiftDate = (dateString, offset) => {
  const date = new Date(dateString)
  // Date invalide : on renvoie la valeur d'entrée inchangée pour rester prévisible.
  if (isNaN(date.getTime())) {
    return dateString
  }
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}
