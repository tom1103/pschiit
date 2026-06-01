import SunCalc from 'suncalc'
import { formatTime } from './formatters'

/**
 * @description Facteur de conversion degrés → radians.
 * @type {number}
 */
const DEG_TO_RAD = Math.PI / 180

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

/**
 * @description Calcule le point subsolaire : la coordonnée géographique (latitude, longitude)
 * où le Soleil se trouve exactement au zénith à l'instant donné. Ce point permet de positionner
 * la lumière du Soleil sur un globe 3D afin d'y faire apparaître la frontière jour/nuit (terminateur).
 *
 * L'algorithme s'appuie sur une approximation de la position solaire (modèle NOAA, précision
 * de l'ordre de quelques centièmes de degré sur la période moderne), suffisante pour une
 * visualisation temps réel.
 * @param {Date} date - L'instant pour lequel calculer le point subsolaire.
 * @returns {{lat: number, lon: number}} La latitude (= déclinaison solaire) et la longitude
 * subsolaires en degrés. La longitude est normalisée dans l'intervalle ]-180, 180].
 */
export const getSubsolarPoint = (date) => {
  // Date invalide : on renvoie le point d'origine (golfe de Guinée) pour rester prévisible.
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { lat: 0, lon: 0 }
  }

  // Conversion en jour julien puis en nombre de jours depuis l'époque J2000.0.
  const jourJulien = date.getTime() / 86400000 + 2440587.5
  const n = jourJulien - 2451545.0

  // Longitude moyenne et anomalie moyenne du Soleil (en degrés).
  const longitudeMoyenne = (280.46 + 0.9856474 * n) % 360
  const anomalieMoyenne = ((357.528 + 0.9856003 * n) % 360) * DEG_TO_RAD

  // Longitude écliptique apparente du Soleil (équation du centre simplifiée).
  const longitudeEcliptique =
    (longitudeMoyenne +
      1.915 * Math.sin(anomalieMoyenne) +
      0.02 * Math.sin(2 * anomalieMoyenne)) *
    DEG_TO_RAD

  // Obliquité de l'écliptique (inclinaison de l'axe terrestre).
  const obliquite = (23.439 - 0.0000004 * n) * DEG_TO_RAD

  // Déclinaison solaire = latitude du point subsolaire.
  const declinaison = Math.asin(Math.sin(obliquite) * Math.sin(longitudeEcliptique)) / DEG_TO_RAD

  // Ascension droite du Soleil.
  const ascensionDroite =
    Math.atan2(
      Math.cos(obliquite) * Math.sin(longitudeEcliptique),
      Math.cos(longitudeEcliptique),
    ) / DEG_TO_RAD

  // Temps sidéral moyen de Greenwich (degrés) : oriente la Terre dans le repère céleste.
  const gmst = (280.46061837 + 360.98564736629 * n) % 360

  // Longitude subsolaire = ascension droite - temps sidéral, ramenée dans ]-180, 180].
  let lon = ascensionDroite - gmst
  lon = ((((lon + 180) % 360) + 360) % 360) - 180

  return { lat: declinaison, lon }
}

/**
 * @description Description des fenêtres horaires les plus intéressantes pour la photographie,
 * dérivées des heures solaires fournies par SunCalc. On distingue l'heure bleue (lumière froide
 * et diffuse autour du crépuscule civil) et l'heure dorée (lumière chaude et rasante autour du
 * lever/coucher du soleil).
 * @type {Array<{name: string, type: string, from: string, to: string, description: string}>}
 */
const FENETRES_PHOTO = [
  {
    name: 'Heure bleue (matin)',
    type: 'blue',
    from: 'dawn',
    to: 'sunrise',
    description:
      'Lumière bleutée et douce avant le lever du soleil, idéale pour les paysages urbains et les ciels.',
  },
  {
    name: 'Heure dorée (matin)',
    type: 'golden',
    from: 'sunrise',
    to: 'goldenHourEnd',
    description:
      'Lumière chaude et rasante après le lever, parfaite pour les portraits et les ombres longues.',
  },
  {
    name: 'Heure dorée (soir)',
    type: 'golden',
    from: 'goldenHour',
    to: 'sunset',
    description: 'Lumière chaude avant le coucher : le créneau le plus prisé des photographes.',
  },
  {
    name: 'Heure bleue (soir)',
    type: 'blue',
    from: 'sunset',
    to: 'dusk',
    description:
      'Lumière bleutée après le coucher, idéale pour les photos de ville illuminée et les longues poses.',
  },
]

/**
 * @description Construit la liste des meilleurs moments pour photographier (heures bleues et dorées)
 * à partir d'un résultat SunCalc.getTimes, en ajoutant les libellés horaires et un statut
 * temporel (passé / en cours / à venir) calculé par rapport à un instant de référence.
 * @param {object} times - Objet retourné par SunCalc.getTimes (heures des événements solaires).
 * @param {Date} [now=new Date()] - Instant de référence pour déterminer le statut de chaque créneau.
 * @returns {Array<{name: string, type: string, start: Date, end: Date, fromLabel: string,
 * toLabel: string, description: string, status: ('past'|'active'|'upcoming')}>} Les créneaux
 * valides (heures non NaN), enrichis et triés dans l'ordre chronologique de la journée.
 */
export const getPhotographyMoments = (times, now = new Date()) => {
  if (!times || typeof times !== 'object') {
    return []
  }

  const reference = now instanceof Date && !isNaN(now.getTime()) ? now.getTime() : Date.now()

  return FENETRES_PHOTO.map((fenetre) => {
    const start = times[fenetre.from]
    const end = times[fenetre.to]

    // On ignore les créneaux dont les bornes sont invalides (ex. régions polaires).
    if (
      !(start instanceof Date) ||
      !(end instanceof Date) ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      return null
    }

    // Détermination du statut temporel du créneau par rapport à l'instant de référence.
    let status
    if (reference < start.getTime()) {
      status = 'upcoming'
    } else if (reference > end.getTime()) {
      status = 'past'
    } else {
      status = 'active'
    }

    return {
      name: fenetre.name,
      type: fenetre.type,
      start,
      end,
      fromLabel: formatTime(start),
      toLabel: formatTime(end),
      description: fenetre.description,
      status,
    }
  }).filter((moment) => moment !== null)
}
