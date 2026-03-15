<script setup>
import { computed } from 'vue'
import SunriseIcon from './icons/SunriseIcon.vue'
import SunsetIcon from './icons/SunsetIcon.vue'
import DayIcon from './icons/DayIcon.vue'
import NightIcon from './icons/NightIcon.vue'

/**
 * @description Props du composant SunIcon.
 */
const props = defineProps({
  /**
   * Le nom de l'icône à afficher.
   * Doit correspondre à une clé dans l'objet 'icons'.
   * @type {('sunrise'|'sunset'|'day'|'night')}
   */
  name: {
    type: String,
    required: true,
  },
})

/**
 * @description Dictionnaire contenant les composants des différentes icônes.
 * @type {Object<string, import('vue').Component>}
 */
const icons = {
  sunrise: SunriseIcon,
  sunset: SunsetIcon,
  day: DayIcon,
  night: NightIcon,
}

/**
 * @description Propriété calculée qui retourne le composant de l'icône demandée via la prop 'name'.
 * @type {import('vue').ComputedRef<import('vue').Component | null>}
 */
const activeIcon = computed(() => icons[props.name] || null)
</script>

<template>
  <div class="w-6 h-6">
    <component :is="activeIcon" v-if="activeIcon" />
  </div>
</template>
