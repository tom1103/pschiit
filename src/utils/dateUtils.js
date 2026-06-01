/**
 * @description Ré-export de `formatTime` depuis le module `formatters` afin d'éliminer
 * la duplication de logique : il n'existe désormais qu'une seule implémentation (la plus
 * robuste, qui valide le type et la validité de la date). L'export reste disponible ici
 * pour préserver la compatibilité avec les imports existants (`@/utils/dateUtils`).
 */
export { formatTime } from './formatters'
