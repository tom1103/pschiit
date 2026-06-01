<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import SunCalc from 'suncalc'
import { getSubsolarPoint, getMoonPhaseInfo } from '@/utils/sunUtils'

/**
 * @description Props du composant : la position de l'utilisateur, marquée sur le globe.
 */
const props = defineProps({
  /** Latitude de l'utilisateur (degrés), utilisée pour positionner le marqueur sur la Terre. */
  latitude: {
    type: Number,
    required: true,
  },
  /** Longitude de l'utilisateur (degrés), utilisée pour positionner le marqueur sur la Terre. */
  longitude: {
    type: Number,
    required: true,
  },
})

/**
 * @description Facteur de conversion degrés → radians.
 * @type {number}
 */
const DEG_TO_RAD = Math.PI / 180

/**
 * @type {import('vue').Ref<boolean>}
 * @description Indique si le navigateur supporte WebGL. Détermine l'affichage de la scène 3D
 * ou d'un message de repli.
 */
const isWebglSupported = ref(true)

/**
 * @type {import('vue').Ref<HTMLElement|null>}
 * @description Référence vers le conteneur DOM qui accueille le canvas WebGL.
 */
const canvasContainer = ref(null)

/**
 * @type {import('vue').Ref<boolean>}
 * @description Vrai si la position de l'utilisateur est actuellement éclairée par le Soleil (jour).
 */
const isUserInDaylight = ref(false)

/**
 * @type {import('vue').Ref<string>}
 * @description Nom de la phase lunaire courante, affiché dans la légende.
 */
const moonPhaseName = ref('')

// Variables internes de la scène Three.js (non réactives : gérées manuellement).
let three = null
let renderer = null
let scene = null
let camera = null
let controls = null
let sunLight = null
let sunMesh = null
let moonMesh = null
let animationFrameId = null
let resizeObserver = null
let lastAstroUpdate = 0

/**
 * @description Détecte la disponibilité de WebGL dans le navigateur courant.
 * @returns {boolean} Vrai si un contexte WebGL peut être créé.
 */
function detectWebgl() {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

/**
 * @description Convertit des coordonnées géographiques (lat/lon en degrés) en vecteur 3D unitaire,
 * dans le repère fixe de la Terre (pôle Nord vers +Y). Le Soleil et le marqueur utilisent la même
 * conversion, ce qui garantit la cohérence de la frontière jour/nuit.
 * @param {number} latDeg - Latitude en degrés.
 * @param {number} lonDeg - Longitude en degrés.
 * @param {number} radius - Rayon souhaité du vecteur résultant.
 * @returns {object} Un Vector3 de Three.js.
 */
function geoToVector(latDeg, lonDeg, radius) {
  const lat = latDeg * DEG_TO_RAD
  const lon = lonDeg * DEG_TO_RAD
  const x = radius * Math.cos(lat) * Math.cos(lon)
  const y = radius * Math.sin(lat)
  const z = -radius * Math.cos(lat) * Math.sin(lon)
  return new three.Vector3(x, y, z)
}

/**
 * @type {object|null}
 * @description Marqueur 3D de la position de l'utilisateur sur le globe.
 */
let userMarker = null

/**
 * @description Repositionne le marqueur de l'utilisateur à la surface de la Terre selon les props.
 */
function updateUserMarker() {
  if (!userMarker || !three) return
  // Légèrement au-dessus de la surface (rayon 1) pour rester visible.
  userMarker.position.copy(geoToVector(props.latitude, props.longitude, 1.02))
}

/**
 * @description Met à jour les éléments astronomiques (position du Soleil/lumière, de la Lune,
 * et l'indicateur jour/nuit) en fonction de l'heure réelle courante.
 */
function updateAstronomy() {
  const now = new Date()

  // Point subsolaire : direction de la lumière du Soleil dans le repère fixe de la Terre.
  const { lat, lon } = getSubsolarPoint(now)
  const sunDirection = geoToVector(lat, lon, 1)

  // La lumière directionnelle (rayons parallèles) éclaire la Terre ET la Lune depuis cette direction,
  // ce qui fait apparaître naturellement le terminateur sur la Terre et la bonne phase sur la Lune.
  sunLight.position.copy(sunDirection.clone().multiplyScalar(10))
  sunMesh.position.copy(sunDirection.clone().multiplyScalar(8))

  // Position de la Lune : on l'écarte du Soleil d'un angle d'élongation dérivé de la phase
  // (nouvelle lune ≈ près du Soleil, pleine lune ≈ opposée). Représentation schématique de l'orbite.
  const { name, phase } = getMoonPhaseInfo(now)
  moonPhaseName.value = name
  const elongation = phase * 2 * Math.PI
  const moonDir = sunDirection
    .clone()
    .applyAxisAngle(new three.Vector3(0, 1, 0), elongation)
  moonMesh.position.copy(moonDir.multiplyScalar(2.6))

  // Indicateur jour/nuit pour la position de l'utilisateur : altitude solaire positive = jour.
  const sunPos = SunCalc.getPosition(now, props.latitude, props.longitude)
  isUserInDaylight.value = sunPos.altitude > 0
}

/**
 * @description Boucle d'animation : rafraîchit l'astronomie au plus une fois par seconde
 * (calculs coûteux) et rend la scène à chaque frame.
 * @param {number} timestamp - Horodatage fourni par requestAnimationFrame.
 */
function animate(timestamp) {
  animationFrameId = requestAnimationFrame(animate)

  // On limite les recalculs astronomiques à une fois par seconde pour économiser le CPU.
  if (timestamp - lastAstroUpdate > 1000) {
    updateAstronomy()
    lastAstroUpdate = timestamp
  }

  if (controls) controls.update()
  renderer.render(scene, camera)
}

/**
 * @description Construit la scène 3D : Terre, grille, marqueur, Soleil, Lune, lumières et caméra.
 */
function buildScene() {
  const width = canvasContainer.value.clientWidth || 600
  const height = canvasContainer.value.clientHeight || 400

  scene = new three.Scene()
  scene.background = new three.Color(0x05060f)

  camera = new three.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 1.5, 4)

  renderer = new three.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  canvasContainer.value.appendChild(renderer.domElement)

  // Terre : sphère océan-bleu éclairée par le Soleil (la moitié éclairée = jour).
  const earth = new three.Mesh(
    new three.SphereGeometry(1, 64, 64),
    new three.MeshStandardMaterial({
      color: 0x1f6feb,
      emissive: 0x081026,
      roughness: 1,
      metalness: 0,
    }),
  )
  scene.add(earth)

  // Grille latitude/longitude pour donner un aspect « globe ».
  const grid = new three.Mesh(
    new three.SphereGeometry(1.005, 24, 24),
    new three.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.15 }),
  )
  scene.add(grid)

  // Marqueur de la position de l'utilisateur.
  userMarker = new three.Mesh(
    new three.SphereGeometry(0.035, 16, 16),
    new three.MeshBasicMaterial({ color: 0xff3b30 }),
  )
  scene.add(userMarker)
  updateUserMarker()

  // Soleil : petite sphère émissive (repère visuel) + lumière directionnelle (rayons parallèles).
  sunMesh = new three.Mesh(
    new three.SphereGeometry(0.4, 32, 32),
    new three.MeshBasicMaterial({ color: 0xffd54a }),
  )
  scene.add(sunMesh)

  sunLight = new three.DirectionalLight(0xffffff, 2.5)
  scene.add(sunLight)
  scene.add(sunLight.target)

  // Lumière ambiante faible pour que le côté nuit ne soit pas totalement noir.
  scene.add(new three.AmbientLight(0x404a6b, 0.6))

  // Lune : sphère grise, éclairée par la même lumière directionnelle que la Terre.
  moonMesh = new three.Mesh(
    new three.SphereGeometry(0.27, 32, 32),
    new three.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1, metalness: 0 }),
  )
  scene.add(moonMesh)
}

/**
 * @description Adapte le rendu et la caméra à la taille du conteneur (responsive).
 */
function handleResize() {
  if (!renderer || !camera || !canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  if (width === 0 || height === 0) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

/**
 * @description Initialise la scène 3D : charge Three.js en différé (lazy-load) uniquement
 * lorsque WebGL est disponible, afin de ne pas alourdir le bundle pour les navigateurs non compatibles.
 */
async function initScene() {
  // Import différé de Three.js et des contrôles d'orbite (le bundle ne les charge qu'ici).
  three = await import('three')
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')

  // Le composant a pu être démonté pendant le chargement asynchrone.
  if (!canvasContainer.value) return

  buildScene()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 2
  controls.maxDistance = 8
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.4

  updateAstronomy()

  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(canvasContainer.value)

  animationFrameId = requestAnimationFrame(animate)
}

onMounted(() => {
  isWebglSupported.value = detectWebgl()
  if (isWebglSupported.value) {
    // En cas d'échec d'initialisation (ex. WebGL bloqué), on bascule sur le repli.
    initScene().catch((error) => {
      console.error('Échec de l\'initialisation de la scène 3D :', error)
      isWebglSupported.value = false
    })
  }
})

/**
 * @description Met à jour le marqueur lorsque la position de l'utilisateur change.
 */
watch(
  () => [props.latitude, props.longitude],
  () => updateUserMarker(),
)

/**
 * @description Libère les ressources Three.js (boucle d'animation, observateurs, mémoire GPU)
 * lorsque le composant est démonté, afin d'éviter les fuites mémoire.
 */
onUnmounted(() => {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  if (resizeObserver) resizeObserver.disconnect()
  if (controls) controls.dispose()
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) object.material.dispose()
    })
  }
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }
})
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-6 mt-6 max-w-4xl mx-auto">
    <h2 class="text-xl font-semibold text-gray-700 mb-4 border-b-2 border-blue-400 pb-2">
      Terre, Lune et Soleil en temps réel
    </h2>

    <!-- Scène 3D affichée si WebGL est supporté -->
    <div v-if="isWebglSupported">
      <div ref="canvasContainer" class="globe-container"></div>
      <div class="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-gray-600">
        <span class="flex items-center">
          <span class="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
          Votre position :
          <strong class="ml-1">{{ isUserInDaylight ? 'de jour ☀️' : 'de nuit 🌙' }}</strong>
        </span>
        <span v-if="moonPhaseName" class="flex items-center">🌙 {{ moonPhaseName }}</span>
        <span class="text-gray-400">Glissez pour faire tourner le globe</span>
      </div>
    </div>

    <!-- Message de repli si WebGL n'est pas disponible -->
    <div v-else class="globe-fallback">
      <p class="text-gray-700 font-semibold">Visualisation 3D indisponible</p>
      <p class="text-sm text-gray-500">
        Votre navigateur ne supporte pas WebGL, nécessaire pour afficher la scène 3D temps réel.
      </p>
    </div>
  </div>
</template>

<style scoped>
.globe-container {
  width: 100%;
  height: 420px;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: grab;
}
.globe-container:active {
  cursor: grabbing;
}
.globe-fallback {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-color: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
}
</style>
