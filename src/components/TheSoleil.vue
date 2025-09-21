<script setup>
import { ref, computed } from 'vue'
import * as SunCalc from 'suncalc'

// Définir la latitude et la longitude (pour Paris, France)
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
    console.log("La géolocalisation n'est pas supportée par ce navigateur.")
  }
}

const formattedSunsetTime = computed(() => {
  const times = SunCalc.getTimes(date.value, latitude.value, longitude.value)
  const sunsetTime = times.sunset
  return sunsetTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<template>
  <div class="soleil-container">
    <h2>Coucher du soleil</h2>
    <div class="controls">
      <button @click="geoLoc">Utiliser ma position</button>
      <div class="input-group">
        <label for="latitude">Latitude:</label>
        <input type="number" name="latitude" id="latitude" v-model.number="latitude" />
      </div>
      <div class="input-group">
        <label for="longitude">Longitude:</label>
        <input type="number" name="longitude" id="longitude" v-model.number="longitude" />
      </div>
    </div>
    <p class="sunset-time">
      Le soleil se couchera à : <strong>{{ formattedSunsetTime }}</strong>
    </p>
  </div>
</template>

<style scoped>
.soleil-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  max-width: 400px;
  margin: 2rem auto;
}

.sunset-time {
  font-size: 1.2rem;
}
</style>
