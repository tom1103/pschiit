<script setup>
import { ref, computed } from 'vue'
import * as SunCalc from 'suncalc'
import SunIcon from './SunIcon.vue'

// --- Geolocation and Date ---
const latitude = ref(48.8566)
const longitude = ref(2.3522)
const date = ref(new Date())

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

// --- SunCalc Times Calculation ---
const times = computed(() => {
  return SunCalc.getTimes(date.value, latitude.value, longitude.value)
})

// --- Helper to format time ---
const formatTime = (date) => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- Structured Sun Events ---
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
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">Éphémérides du Soleil</h1>

      <!-- Controls -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="flex flex-col">
          <label for="latitude" class="text-sm font-medium text-gray-600 mb-1">Latitude</label>
          <input type="number" id="latitude" v-model.number="latitude" class="p-2 border rounded-md focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex flex-col">
          <label for="longitude" class="text-sm font-medium text-gray-600 mb-1">Longitude</label>
          <input type="number" id="longitude" v-model.number="longitude" class="p-2 border rounded-md focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex items-end">
          <button @click="geoLoc" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300">
            Utiliser ma position
          </button>
        </div>
      </div>

      <!-- Sun Events -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Day Events -->
        <div>
          <h2 class="text-xl font-semibold text-gray-700 mb-4 border-b-2 border-yellow-400 pb-2">Jour</h2>
          <ul class="space-y-3">
            <li v-for="event in sunEvents.day" :key="event.name" class="flex items-center p-2 rounded-md hover:bg-gray-50">
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
            <li v-for="event in sunEvents.night" :key="event.name" class="flex items-center p-2 rounded-md hover:bg-gray-50">
               <SunIcon :name="event.icon" class="w-6 h-6 mr-3 text-indigo-500" />
              <span class="flex-1 text-gray-700">{{ event.name }}</span>
              <span class="font-semibold text-gray-800">{{ formatTime(event.time) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles can be added here if Tailwind classes are not sufficient */
</style>
