<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getPhotographyMoments } from '@/utils/sunUtils'

/**
 * @description Props du composant : les heures solaires de la journée affichée.
 */
const props = defineProps({
  /** Objet retourné par SunCalc.getTimes, contenant les heures des événements solaires. */
  times: {
    type: Object,
    required: true,
  },
})

/**
 * @type {import('vue').Ref<Date>}
 * @description Heure courante, rafraîchie périodiquement pour réévaluer le statut des créneaux.
 */
const now = ref(new Date())

/**
 * @type {number|null}
 * @description Identifiant de l'intervalle de rafraîchissement de l'heure courante.
 */
let intervalId = null

/**
 * @description Démarre le rafraîchissement de l'heure courante (toutes les minutes) au montage.
 */
onMounted(() => {
  intervalId = setInterval(() => {
    now.value = new Date()
  }, 60000)
})

/**
 * @description Nettoie l'intervalle lorsque le composant est démonté.
 */
onUnmounted(() => {
  if (intervalId !== null) clearInterval(intervalId)
})

/**
 * @type {import('vue').ComputedRef<Array<object>>}
 * @description Liste des meilleurs créneaux photo (heures bleues/dorées) avec leur statut temporel.
 */
const moments = computed(() => getPhotographyMoments(props.times, now.value))

/**
 * @description Retourne les classes CSS de la pastille de couleur selon le type de créneau.
 * @param {string} type - Type de créneau ('blue' ou 'golden').
 * @returns {string} Les classes Tailwind correspondantes.
 */
const dotClass = (type) => (type === 'golden' ? 'bg-amber-400' : 'bg-blue-400')
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-6 mt-6 max-w-4xl mx-auto">
    <h2 class="text-xl font-semibold text-gray-700 mb-1 border-b-2 border-amber-400 pb-2">
      Moments pour la photo 📷
    </h2>
    <p class="text-sm text-gray-500 mb-4">
      Les meilleures fenêtres de lumière de la journée pour vos prises de vue.
    </p>

    <!-- Message si aucun créneau exploitable (ex. régions polaires) -->
    <p v-if="moments.length === 0" class="text-sm text-gray-500 italic">
      Aucun créneau d'heure bleue ou dorée pour cette date et cette position.
    </p>

    <ul v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <li
        v-for="moment in moments"
        :key="moment.name"
        class="p-3 rounded-md border transition"
        :class="
          moment.status === 'active'
            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
            : moment.status === 'past'
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : 'border-gray-200 bg-white'
        "
      >
        <div class="flex items-center justify-between">
          <span class="flex items-center font-semibold text-gray-800">
            <span class="inline-block w-3 h-3 rounded-full mr-2" :class="dotClass(moment.type)"></span>
            {{ moment.name }}
          </span>
          <!-- Badge « En cours » pour le créneau actif -->
          <span
            v-if="moment.status === 'active'"
            class="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full"
          >
            En cours
          </span>
        </div>
        <p class="text-sm font-medium text-gray-700 mt-1">
          {{ moment.fromLabel }} → {{ moment.toLabel }}
        </p>
        <p class="text-xs text-gray-500 mt-1">{{ moment.description }}</p>
      </li>
    </ul>
  </div>
</template>
