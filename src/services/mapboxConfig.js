/**
 * @description Service pour gérer la configuration de Mapbox.
 */

/**
 * @description Récupère le jeton d'accès Mapbox depuis les variables d'environnement.
 * @returns {string|null} Le jeton d'accès ou null s'il n'est pas configuré.
 */
export const getMapboxAccessToken = () => {
  return import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || null
}

/**
 * @description Vérifie si le jeton d'accès Mapbox est configuré.
 * @returns {boolean} Vrai si le jeton est présent, faux sinon.
 */
export const hasMapboxAccessToken = () => {
  const token = getMapboxAccessToken()
  return typeof token === 'string' && token.trim().length > 0
}
