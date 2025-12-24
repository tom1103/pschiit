<script setup>
import { onMounted } from 'vue'

/**
 * @description Événements émis par le composant.
 * @emits close - Émis lorsque la modale demande à être fermée (clic sur le fond ou le bouton).
 * @emits open - Émis lorsque le composant est monté et prêt à être affiché.
 */
const emit = defineEmits(['close', 'open'])

/**
 * @description Fonction pour émettre l'événement de fermeture.
 */
const close = () => {
  emit('close')
}

/**
 * @description Émet l'événement 'open' une fois que le composant est monté.
 */
onMounted(() => {
    emit('open')
})
</script>

<template>
  <div class="modal-backdrop" @click="close">
    <div class="modal-content" @click.stop>
      <button class="close-button" @click="close">&times;</button>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  min-width: 50vw;
  min-height: 50vh;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #333;
}
</style>
