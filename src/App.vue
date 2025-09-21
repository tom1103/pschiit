<script setup>
import TheSoleil from './components/TheSoleil.vue'
</script>

<template>
  <header>
    <div class="wrapper">
      <img alt="Logo Pschiit" class="logo" src="./assets/logo/jour.webp" width="125" height="125" />
    </div>
  </header>

  <main>
    <TheSoleil></TheSoleil>
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
