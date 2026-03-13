<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getMapboxAccessToken, hasMapboxAccessToken } from '@/services/mapboxConfig'

/**
 * @description Props du composant pour la carte de localisation.
 */
const props = defineProps({
  /**
   * La longitude du centre de la carte.
   */
  longitude: {
    type: Number,
    required: true,
  },
  /**
   * La latitude du centre de la carte.
   */
  latitude: {
    type: Number,
    required: true,
  },
  /**
   * Indique si le marqueur doit clignoter pour indiquer le suivi.
   */
  suivreLocalisation: {
    type: Boolean,
    default: false,
  },
  /**
   * Le niveau de zoom initial de la carte.
   */
  zoom: {
    type: Number,
    default: 9,
  },
  /**
   * Le style de la carte Mapbox à utiliser.
   */
  mapStyle: {
    type: String,
    default: 'mapbox://styles/tom1103/cjfhz8z59dz0h2ro7k8l43pow',
  },
})

/**
 * @type {import('vue').Ref<HTMLElement|null>}
 * @description Référence vers l'élément conteneur de la carte Mapbox.
 */
const mapContainer = ref(null)

/**
 * @type {mapboxgl.Map|null}
 * @description Instance de la carte Mapbox.
 */
let map = null

/**
 * @description Indicateur de validité du jeton Mapbox.
 */
const isTokenValid = ref(hasMapboxAccessToken())

/**
 * @type {mapboxgl.Marker|null}
 * @description Instance du marqueur sur la carte.
 */
let marker = null

/**
 * @description Initialise la carte Mapbox et le marqueur lorsque le composant est monté.
 */
onMounted(() => {
  if (!isTokenValid.value) {
    console.error('Mapbox access token is missing.')
    return
  }

  mapboxgl.accessToken = getMapboxAccessToken()
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: props.mapStyle,
    center: [props.longitude, props.latitude],
    zoom: props.zoom,
  })

  marker = new mapboxgl.Marker().setLngLat([props.longitude, props.latitude]).addTo(map)

  // Surveille la prop 'suivreLocalisation' pour ajouter/retirer l'effet de clignotement.
  watch(
    () => props.suivreLocalisation,
    (newValue) => {
      const markerElement = marker.getElement()
      if (newValue) {
        markerElement.classList.add('blinking')
      } else {
        markerElement.classList.remove('blinking')
      }
    },
    { immediate: true },
  )
})

/**
 * @description Nettoie l'instance de la carte lorsque le composant est démonté.
 */
onUnmounted(() => {
  if (map) {
    map.remove()
  }
})

/**
 * @description Met à jour la position de la carte et du marqueur lorsque la latitude ou la longitude changent.
 */
watch(
  () => [props.longitude, props.latitude],
  (newLngLat) => {
    if (map) {
      map.flyTo({
        center: newLngLat,
        essential: true,
      })
      if (marker) {
        marker.setLngLat(newLngLat)
      }
    }
  },
)

/**
 * @description Met à jour le niveau de zoom de la carte.
 */
watch(
  () => props.zoom,
  (newZoom) => {
    if (map) {
      map.flyTo({
        zoom: newZoom,
        essential: true,
      })
    }
  },
)

/**
 * @description Met à jour le style de la carte.
 */
watch(
  () => props.mapStyle,
  (newStyle) => {
    if (map) {
      map.setStyle(newStyle)
    }
  },
)
</script>

<template>
  <div v-if="isTokenValid" ref="mapContainer" class="map-container"></div>
  <div v-else class="map-error-container">
    <p class="text-red-500 font-semibold">Configuration de la carte manquante</p>
    <p class="text-sm text-gray-600">
      Veuillez configurer votre jeton d'accès Mapbox pour afficher la carte.
    </p>
  </div>
</template>

<style scoped>
:deep(.blinking .mapboxgl-marker-anchor-center) {
  animation: blink 1s infinite;
}

@keyframes blink {
  50% {
    opacity: 0.5;
  }
}

.map-container,
.map-error-container {
  width: 100%;
  height: 500px;
}

.map-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
}
</style>
