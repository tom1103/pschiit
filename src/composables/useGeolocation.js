import { ref, watch, onUnmounted } from 'vue'

/**
 * @description Composable pour gérer la géolocalisation de l'utilisateur.
 * @returns {object} Un objet contenant les états réactifs et les méthodes de géolocalisation.
 */
export function useGeolocation() {
  /**
   * @type {import('vue').Ref<number>}
   * @description Référence pour la latitude (défaut: Paris).
   */
  const latitude = ref(48.8566)

  /**
   * @type {import('vue').Ref<number>}
   * @description Référence pour la longitude (défaut: Paris).
   */
  const longitude = ref(2.3522)

  /**
   * @type {import('vue').Ref<boolean>}
   * @description Indicateur pour savoir si le suivi de la localisation est activé.
   */
  const suivreLocalisation = ref(false)

  /**
   * @type {import('vue').Ref<string>}
   * @description Message d'erreur pour la géolocalisation.
   */
  const locationError = ref('')

  /**
   * @type {number|null}
   * @description ID du watchPosition pour le suivi de la géolocalisation.
   */
  let watchId = null

  /**
   * @description Arrête le suivi de la localisation.
   */
  const stopTracking = () => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }

  /**
   * @description Démarre le suivi de la localisation en temps réel.
   */
  const startTracking = () => {
    if (navigator.geolocation) {
      locationError.value = ''
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          latitude.value = position.coords.latitude
          longitude.value = position.coords.longitude
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error)
          // On ne met pas à jour locationError ici pour éviter d'interrompre l'expérience utilisateur pendant le suivi,
          // sauf si spécifié autrement par les besoins métiers.
        },
      )
    } else {
      locationError.value = "La géolocalisation n'est pas supportée par ce navigateur."
      suivreLocalisation.value = false
    }
  }

  /**
   * @description Récupère ponctuellement la position géographique actuelle de l'utilisateur.
   */
  function geoLoc() {
    locationError.value = ''
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          latitude.value = position.coords.latitude
          longitude.value = position.coords.longitude
          locationError.value = ''
        },
        (error) => {
          suivreLocalisation.value = false
          switch (error.code) {
            case error.PERMISSION_DENIED:
              locationError.value = "L'accès à la position a été refusé."
              break
            case error.POSITION_UNAVAILABLE:
              locationError.value = 'Les informations de position sont indisponibles.'
              break
            case error.TIMEOUT:
              locationError.value = 'La demande de position a expiré.'
              break
            default:
              locationError.value = 'Une erreur inconnue est survenue.'
              break
          }
        },
      )
    } else {
      locationError.value = "La géolocalisation n'est pas supportée par ce navigateur."
    }
  }

  /**
   * @description Surveille 'suivreLocalisation' pour démarrer ou arrêter le suivi.
   */
  watch(suivreLocalisation, (newValue) => {
    if (newValue) {
      startTracking()
    } else {
      stopTracking()
    }
  })

  /**
   * @description Nettoyage lors du démontage du composant.
   */
  onUnmounted(() => {
    stopTracking()
  })

  return {
    latitude,
    longitude,
    locationError,
    suivreLocalisation,
    geoLoc,
  }
}
