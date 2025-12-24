<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import * as SunCalc from 'suncalc'
import SunIcon from './SunIcon.vue'
import CarteLocalisation from './CarteLocalisation.vue'
import SunMoonGraph from './SunMoonGraph.vue'

// --- Géolocalisation et Date ---

/**
 * @type {import('vue').Ref<number>}
 * @description Référence pour la latitude de l'utilisateur.
 */
const latitude = ref(48.8566)

/**
 * @type {import('vue').Ref<number>}
 * @description Référence pour la longitude de l'utilisateur.
 */
const longitude = ref(2.3522)

/**
 * @type {import('vue').Ref<string>}
 * @description Référence pour la date sélectionnée, au format YYYY-MM-DD.
 */
const date = ref(new Date().toISOString().slice(0, 10))

/**
 * @type {import('vue').Ref<boolean>}
 * @description Indicateur pour savoir si la géolocalisation en temps réel est activée.
 */
const suivreLocalisation = ref(false)

/**
 * @type {import('vue').ComputedRef<Date>}
 * @description Propriété calculée qui convertit la date de la chaîne de caractères en objet Date pour SunCalc.
 */
const sunCalcDate = computed(() => new Date(date.value))

/**
 * @type {import('vue').Ref<boolean>}
 * @description Indicateur pour afficher ou masquer les contrôles de saisie manuelle.
 */
const showManualControls = ref(false)

/**
 * @type {number|null}
 * @description ID de l'intervalle pour la mise à jour de la géolocalisation.
 */
let intervalId = null

/**
 * @description Surveille les changements de la variable `suivreLocalisation` pour démarrer ou arrêter le suivi de la géolocalisation.
 */
watch(suivreLocalisation, (newValue) => {
  if (newValue) {
    geoLoc() // Appel initial
    intervalId = setInterval(geoLoc, 60000) // Met à jour toutes les minutes
  } else if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
})

/**
 * @description Nettoie l'intervalle de géolocalisation lorsque le composant est démonté.
 */
onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})

/**
 * @description Récupère la position géographique actuelle de l'utilisateur.
 */
function geoLoc() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      latitude.value = position.coords.latitude
      longitude.value = position.coords.longitude
    })
  } else {
    alert("La géolocalisation n'est pas supportée par ce navigateur.")
  }
}

// --- Calcul des heures du soleil ---

/**
 * @type {import('vue').ComputedRef<SunCalc.GetTimesResult>}
 * @description Propriété calculée qui retourne les heures des événements solaires pour la date et la position données.
 */
const times = computed(() => {
  return SunCalc.getTimes(sunCalcDate.value, latitude.value, longitude.value)
})

/**
 * @description Formate un objet Date en une chaîne de caractères de temps lisible (HH:MM).
 * @param {Date} date - L'objet Date à formater.
 * @returns {string} L'heure formatée.
 */
const formatTime = (date) => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * @type {import('vue').ComputedRef<{day: Array<object>, night: Array<object>}>}
 * @description Propriété calculée qui structure les événements solaires en deux listes : jour et nuit.
 */
const sunEvents = computed(() => {
  const t = times.value
  return {
    day: [
      { name: 'Aube', time: t.dawn, icon: 'sunrise' },
      { name: 'Lever du soleil', time: t.sunrise, icon: 'sunrise' },
      { name: 'Fin du lever', time: t.sunriseEnd, icon: 'sunrise' },
      { name: 'Heure dorée (matin)', time: t.goldenHourEnd, icon: 'day' },
      { name: 'Zénith', time: t.solarNoon, icon: 'day' },
      { name: 'Heure dorée (soir)', time: t.goldenHour, icon: 'day' },
      { name: 'Coucher du soleil', time: t.sunsetStart, icon: 'sunset' },
      { name: 'Fin du coucher', time: t.sunset, icon: 'sunset' },
    ],
    night: [
      { name: 'Crépuscule', time: t.dusk, icon: 'sunset' },
      { name: 'Crépuscule nautique', time: t.nauticalDusk, icon: 'sunset' },
      { name: 'Début de la nuit', time: t.night, icon: 'night' },
      { name: 'Nadir', time: t.nadir, icon: 'night' },
      { name: 'Fin de la nuit', time: t.nightEnd, icon: 'night' },
      { name: 'Aube nautique', time: t.nauticalDawn, icon: 'sunrise' },
    ],
  }
})

</script>

<template>
  <div class="max-w-4xl mx-auto p-4 font-sans">
    <div class="bg-white shadow-md rounded-lg p-6">
      <div class="flex items-start justify-between mb-6">
        <SunMoonGraph :latitude="latitude" :longitude="longitude" :date="sunCalcDate" />
        <div class="flex-grow text-center">
          <h1 class="text-2xl font-bold text-gray-800">Éphémérides du Soleil</h1>
        </div>
        <div class="flex-shrink-0">
          <button @click="showManualControls = !showManualControls" class="p-2 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" v-if="!showManualControls" d="M12 4v16m8-8H4" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" v-if="showManualControls" d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Controls -->
      <div v-if="showManualControls" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="flex flex-col">
          <label for="latitude" class="text-sm font-medium text-gray-600 mb-1">Latitude</label>
          <input type="number" id="latitude" v-model.number="latitude" @input="suivreLocalisation = false"
            class="p-2 border rounded-md focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex flex-col">
          <label for="longitude" class="text-sm font-medium text-gray-600 mb-1">Longitude</label>
          <input type="number" id="longitude" v-model.number="longitude" @input="suivreLocalisation = false"
            class="p-2 border rounded-md focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex flex-col">
          <label for="date" class="text-sm font-medium text-gray-600 mb-1">Date</label>
          <input type="date" id="date" v-model="date"
            class="p-2 border rounded-md focus:ring-2 focus:ring-blue-500">
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="flex items-end">
          <button @click="geoLoc"
            class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300">
            Utiliser ma position
          </button>
        </div>
        <div class="flex items-center">
          <input type="checkbox" id="suivre" v-model="suivreLocalisation" class="mr-2">
          <label for="suivre" class="text-sm font-medium text-gray-600">Suivre ma localisation</label>
        </div>
      </div>
      <!-- Sun Events -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Day Events -->
        <div>
          <h2 class="text-xl font-semibold text-gray-700 mb-4 border-b-2 border-yellow-400 pb-2">Jour</h2>
          <ul class="space-y-3">
            <li v-for="event in sunEvents.day" :key="event.name"
              class="flex items-center p-2 rounded-md hover:bg-gray-50">
              <SunIcon :name="event.icon" class="w-6 h-6 mr-3 text-yellow-500" />
              <span class="flex-1 text-gray-700">{{ event.name }}</span>
              <span class="font-semibold text-gray-800">{{ formatTime(event.time) }}</span>
            </li>
          </ul>
        </div>

        <!-- Night Events -->
        <div>
          <h2 class="text-xl font-semibold text-gray-700 mb-4 border-b-2 border-indigo-400 pb-2">Nuit</h2>
          <ul class="space-y-3">
            <li v-for="event in sunEvents.night" :key="event.name"
              class="flex items-center p-2 rounded-md hover:bg-gray-50">
              <SunIcon :name="event.icon" class="w-6 h-6 mr-3 text-indigo-500" />
              <span class="flex-1 text-gray-700">{{ event.name }}</span>
              <span class="font-semibold text-gray-800">{{ formatTime(event.time) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

  </div>
  <CarteLocalisation :latitude="latitude" :longitude="longitude" :suivre-localisation="suivreLocalisation" />
</template>

<style scoped>
/* Scoped styles can be added here if Tailwind classes are not sufficient */
</style>
