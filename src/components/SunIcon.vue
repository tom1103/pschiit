<script setup>
import { computed } from 'vue'

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
 * @description Dictionnaire contenant les SVG des différentes icônes.
 * @type {Object<string, string>}
 */
const icons = {
  sunrise: `
    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-sunrise" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M3 17h1m16 0h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7m-9.7 5.7h6m-3 -1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -4 0v2a2 2 0 0 0 2 2z"></path>
      <path d="M3 21h18"></path>
      <path d="M12 9v-6l3 3m-6 0l3 -3"></path>
    </svg>
  `,
  sunset: `
    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-sunset" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M3 17h1m16 0h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7m-9.7 5.7h6m-3 1a2 2 0 0 1 -2 -2v-2a2 2 0 0 1 4 0v2a2 2 0 0 1 -2 2z"></path>
      <path d="M3 21h18"></path>
      <path d="M12 3v6l3 -3m-6 0l3 3"></path>
    </svg>
  `,
  day: `
    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-sun" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"></path>
    </svg>
  `,
  night: `
    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-moon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"></path>
    </svg>
  `,
};

/**
 * @description Propriété calculée qui retourne le SVG de l'icône demandée via la prop 'name'.
 * @type {import('vue').ComputedRef<string>}
 */
const iconSvg = computed(() => icons[props.name] || '');
</script>

<template>
  <div v-html="iconSvg" class="w-6 h-6"></div>
</template>
