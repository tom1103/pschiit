<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import SunCalc from 'suncalc'
import { getSubsolarPoint, getMoonPhaseInfo } from '@/utils/sunUtils'
import {
  CDN_TEXTURES,
  createEarthTextures,
  createMoonTextures,
  createSunTextures,
} from '@/utils/planetTextures'

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

/**
 * @type {import('vue').Ref<'realiste'|'procedural'>}
 * @description Mode de texture choisi par l'utilisateur : « realiste » (images photographiques
 * chargées depuis le CDN) ou « procedural » (textures générées par code, sans dépendance réseau).
 */
const textureMode = ref('realiste')

// Variables internes de la scène Three.js (non réactives : gérées manuellement).
let three = null
let renderer = null
let scene = null
let camera = null
let controls = null
let sunLight = null
let sunMesh = null
let moonMesh = null
let earthMesh = null
let animationFrameId = null
let resizeObserver = null
let lastAstroUpdate = 0

// Matériaux de la Terre : un matériau standard (mode procédural) et un ShaderMaterial dédié
// (mode réaliste, façon « Earth Shaders »). On bascule earthMesh.material de l'un à l'autre.
let earthStandardMaterial = null
let earthShaderMaterial = null
// Atmosphère (halo de Fresnel autour de la Terre), visible uniquement en mode réaliste.
let atmosphereMaterial = null
let atmosphereMesh = null
// Caches de textures de la Lune (créées paresseusement, conservées entre les bascules de mode).
let moonRealisticTextures = null
let moonProceduralTextures = null

// Direction normalisée Terre → Soleil, partagée avec les shaders via leurs uniforms.
let sunDirectionVector = null

// Toutes les ressources GPU à libérer au démontage (textures, matériaux shader).
let disposables = []

/**
 * @description Vertex shader partagé (Terre et atmosphère) : transmet l'UV, la normale et la
 * position monde au fragment shader.
 * @type {string}
 */
const EARTH_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = modelPosition.xyz;
  }
`

/**
 * @description Fragment shader de la Terre (inspiré de la leçon « Earth Shaders » de Three.js
 * Journey) : mélange jour/nuit selon l'orientation du Soleil, ajoute les nuages, le halo
 * atmosphérique de Fresnel et le reflet spéculaire du Soleil sur les océans.
 * @type {string}
 */
const EARTH_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform sampler2D uSpecularTexture;
  uniform sampler2D uCloudsTexture;
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereDayColor;
  uniform vec3 uAtmosphereTwilightColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 color = vec3(0.0);

    // Orientation par rapport au Soleil : >0 côté jour, <0 côté nuit.
    float sunOrientation = dot(uSunDirection, normal);

    // Transition douce jour/nuit autour du terminateur.
    float dayMix = smoothstep(-0.25, 0.5, sunOrientation);
    vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
    vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
    color = mix(nightColor, dayColor, dayMix);

    // Nuages (canal alpha de la texture) : visibles surtout côté jour.
    float clouds = smoothstep(0.3, 1.0, texture2D(uCloudsTexture, vUv).a);
    color = mix(color, vec3(1.0), clouds * dayMix);

    // Effet de Fresnel : renforce les bords du globe.
    float fresnel = pow(dot(viewDirection, normal) + 1.0, 2.0);

    // Halo atmosphérique : bleu côté jour, orangé au niveau du terminateur (crépuscule).
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, atmosphereDayMix);
    color = mix(color, atmosphereColor, fresnel * atmosphereDayMix);

    // Reflet spéculaire du Soleil sur les océans (masque rouge de la texture spéculaire).
    float specularMask = texture2D(uSpecularTexture, vUv).r;
    vec3 reflection = reflect(-uSunDirection, normal);
    float specular = pow(max(-dot(reflection, viewDirection), 0.0), 32.0) * specularMask;
    vec3 specularColor = mix(vec3(1.0), atmosphereColor, fresnel);
    color += specular * specularColor;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * @description Fragment shader de l'atmosphère : sphère légèrement plus grande rendue en faces
 * arrière, teintée bleu (jour) / orangé (crépuscule), dont l'opacité décroît vers le centre.
 * @type {string}
 */
const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereDayColor;
  uniform vec3 uAtmosphereTwilightColor;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);

    float sunOrientation = dot(uSunDirection, normal);
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, atmosphereDayMix);

    // Opacité : forte sur le pourtour (Fresnel), nulle côté nuit profond.
    float edgeAlpha = smoothstep(0.0, 0.5, dot(viewDirection, normal));
    float dayAlpha = smoothstep(-0.5, 0.0, sunOrientation);
    float alpha = edgeAlpha * dayAlpha;

    gl_FragColor = vec4(atmosphereColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

// Couleurs du halo atmosphérique (reprises de la leçon « Earth Shaders »).
const ATMOSPHERE_DAY_COLOR = '#00aaff'
const ATMOSPHERE_TWILIGHT_COLOR = '#ff6600'

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
  // Au-dessus de la surface pour rester visible malgré le relief (displacement jusqu'à ~0.03).
  userMarker.position.copy(geoToVector(props.latitude, props.longitude, 1.05))
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

  // En mode réaliste, le terminateur de la Terre est calculé dans le shader : on lui transmet la
  // direction du Soleil (idem pour l'atmosphère).
  sunDirectionVector = sunDirection
  if (earthShaderMaterial) earthShaderMaterial.uniforms.uSunDirection.value.copy(sunDirection)
  if (atmosphereMaterial) atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection)

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

  // Terre : sphère éclairée par le Soleil (la moitié éclairée = jour). En mode procédural elle
  // utilise ce matériau standard ; en mode réaliste, earthMesh.material bascule vers le shader.
  // Segments élevés (128) pour que la carte de relief (displacementMap) déforme la géométrie.
  earthStandardMaterial = new three.MeshStandardMaterial({
    color: 0x1f6feb,
    emissive: 0x081026,
    roughness: 1,
    metalness: 0,
  })
  earthMesh = new three.Mesh(new three.SphereGeometry(1, 128, 128), earthStandardMaterial)
  scene.add(earthMesh)

  // Atmosphère : sphère un peu plus grande, rendue en faces arrière, qui forme un halo lumineux
  // autour de la Terre. Visible uniquement en mode réaliste.
  atmosphereMaterial = new three.ShaderMaterial({
    vertexShader: EARTH_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    side: three.BackSide,
    transparent: true,
    uniforms: {
      uSunDirection: { value: new three.Vector3(0, 0, 1) },
      uAtmosphereDayColor: { value: new three.Color(ATMOSPHERE_DAY_COLOR) },
      uAtmosphereTwilightColor: { value: new three.Color(ATMOSPHERE_TWILIGHT_COLOR) },
    },
  })
  atmosphereMesh = new three.Mesh(new three.SphereGeometry(1, 64, 64), atmosphereMaterial)
  atmosphereMesh.scale.setScalar(1.06)
  atmosphereMesh.visible = false
  scene.add(atmosphereMesh)
  disposables.push(atmosphereMaterial)

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

  // Soleil : sphère incandescente (matériau émissif non affecté par la lumière) + lumière
  // directionnelle (rayons parallèles). La texture de surface solaire est générée par code.
  const sunData = createSunTextures()
  const sunTexture = makeCanvasTexture(sunData?.map, true)
  if (sunTexture) disposables.push(sunTexture)
  sunMesh = new three.Mesh(
    new three.SphereGeometry(0.4, 32, 32),
    new three.MeshBasicMaterial(sunTexture ? { map: sunTexture } : { color: 0xffd54a }),
  )
  scene.add(sunMesh)

  sunLight = new three.DirectionalLight(0xffffff, 2.5)
  scene.add(sunLight)
  scene.add(sunLight.target)

  // Lumière ambiante faible pour que le côté nuit ne soit pas totalement noir.
  scene.add(new three.AmbientLight(0x404a6b, 0.6))

  // Lune : sphère éclairée par la même lumière directionnelle que la Terre. Segments élevés
  // pour exploiter le relief (displacementMap) des cratères en mode procédural.
  moonMesh = new three.Mesh(
    new three.SphereGeometry(0.27, 96, 96),
    new three.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1, metalness: 0 }),
  )
  scene.add(moonMesh)

  // Application initiale des textures selon le mode courant.
  applyTextures(textureMode.value)
}

/**
 * @description Enveloppe un canvas dans une CanvasTexture Three.js (ou renvoie null si le canvas
 * est absent, ex. en environnement de test sans contexte 2D).
 * @param {HTMLCanvasElement|null|undefined} canvas - Le canvas source.
 * @param {boolean} [srgb=false] - Vrai pour une texture de couleur (espace sRGB), faux pour une
 * carte de données (relief, normales) qui doit rester linéaire.
 * @returns {object|null} La texture, ou null.
 */
function makeCanvasTexture(canvas, srgb = false) {
  if (!canvas) return null
  const texture = new three.CanvasTexture(canvas)
  if (srgb) texture.colorSpace = three.SRGBColorSpace
  if (renderer?.capabilities?.getMaxAnisotropy) {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  }
  return texture
}

/**
 * @description Construit (une seule fois) le ShaderMaterial réaliste de la Terre : charge les
 * textures jour/nuit/nuages/spéculaire depuis le CDN et les branche sur les uniforms du shader.
 */
function buildEarthShaderMaterial() {
  if (earthShaderMaterial) return

  const loader = new three.TextureLoader()
  loader.setCrossOrigin('anonymous')

  // Textures de couleur en sRGB ; le masque spéculaire reste en données linéaires.
  const day = loader.load(CDN_TEXTURES.earthMap)
  day.colorSpace = three.SRGBColorSpace
  const night = loader.load(CDN_TEXTURES.earthNight)
  night.colorSpace = three.SRGBColorSpace
  const clouds = loader.load(CDN_TEXTURES.earthClouds)
  const specular = loader.load(CDN_TEXTURES.earthSpecular)

  earthShaderMaterial = new three.ShaderMaterial({
    vertexShader: EARTH_VERTEX_SHADER,
    fragmentShader: EARTH_FRAGMENT_SHADER,
    uniforms: {
      uDayTexture: { value: day },
      uNightTexture: { value: night },
      uCloudsTexture: { value: clouds },
      uSpecularTexture: { value: specular },
      uSunDirection: { value: (sunDirectionVector || new three.Vector3(0, 0, 1)).clone() },
      uAtmosphereDayColor: { value: new three.Color(ATMOSPHERE_DAY_COLOR) },
      uAtmosphereTwilightColor: { value: new three.Color(ATMOSPHERE_TWILIGHT_COLOR) },
    },
  })

  disposables.push(day, night, clouds, specular, earthShaderMaterial)
}

/**
 * @description Applique (une seule fois) les textures procédurales sur le matériau standard de la
 * Terre : couleur + relief par bump (ombrage) et displacement (déformation réelle du maillage).
 */
function applyEarthProcedural() {
  if (earthStandardMaterial.userData.proceduralReady) return

  const earthData = createEarthTextures()
  const earthMap = makeCanvasTexture(earthData?.map, true)
  const earthBump = makeCanvasTexture(earthData?.bump, false)

  earthStandardMaterial.map = earthMap
  earthStandardMaterial.bumpMap = earthBump
  earthStandardMaterial.bumpScale = 0.04
  earthStandardMaterial.displacementMap = earthBump
  earthStandardMaterial.displacementScale = earthBump ? 0.03 : 0
  earthStandardMaterial.color.set(earthMap ? 0xffffff : 0x1f6feb)
  earthStandardMaterial.needsUpdate = true

  if (earthMap) disposables.push(earthMap)
  if (earthBump) disposables.push(earthBump)
  earthStandardMaterial.userData.proceduralReady = true
}

/**
 * @description Applique les textures de la Lune selon le mode (réaliste : image CDN servant de
 * couleur et de relief ; procédural : cratères générés avec déformation du maillage).
 * @param {'realiste'|'procedural'} mode - Mode de texture.
 */
function applyMoonTextures(mode) {
  const mat = moonMesh.material

  if (mode === 'realiste') {
    if (!moonRealisticTextures) {
      const loader = new three.TextureLoader()
      loader.setCrossOrigin('anonymous')
      const map = loader.load(CDN_TEXTURES.moonMap)
      map.colorSpace = three.SRGBColorSpace
      if (renderer?.capabilities?.getMaxAnisotropy) {
        map.anisotropy = renderer.capabilities.getMaxAnisotropy()
      }
      moonRealisticTextures = { map }
      disposables.push(map)
    }
    mat.map = moonRealisticTextures.map
    mat.bumpMap = moonRealisticTextures.map
    mat.bumpScale = 3
    mat.displacementMap = null
    mat.displacementScale = 0
    mat.color.set(0xffffff)
  } else {
    if (!moonProceduralTextures) {
      const data = createMoonTextures()
      moonProceduralTextures = {
        map: makeCanvasTexture(data?.map, true),
        bump: makeCanvasTexture(data?.bump, false),
      }
      if (moonProceduralTextures.map) disposables.push(moonProceduralTextures.map)
      if (moonProceduralTextures.bump) disposables.push(moonProceduralTextures.bump)
    }
    mat.map = moonProceduralTextures.map
    mat.bumpMap = moonProceduralTextures.bump
    mat.bumpScale = 2
    mat.displacementMap = moonProceduralTextures.bump
    mat.displacementScale = moonProceduralTextures.bump ? 0.02 : 0
    mat.color.set(moonProceduralTextures.map ? 0xffffff : 0xcfcfcf)
  }
  mat.needsUpdate = true
}

/**
 * @description Bascule l'apparence des astres selon le mode choisi. En réaliste, la Terre utilise
 * un ShaderMaterial (jour/nuit, nuages, atmosphère, reflets) ; en procédural, le matériau standard
 * texturé par code. Les ressources sont mises en cache et réutilisées entre les bascules.
 * @param {'realiste'|'procedural'} mode - Mode de texture.
 */
function applyTextures(mode) {
  if (!three || !earthMesh || !moonMesh) return

  if (mode === 'realiste') {
    buildEarthShaderMaterial()
    earthMesh.material = earthShaderMaterial
    if (atmosphereMesh) atmosphereMesh.visible = true
  } else {
    applyEarthProcedural()
    earthMesh.material = earthStandardMaterial
    if (atmosphereMesh) atmosphereMesh.visible = false
  }

  applyMoonTextures(mode)
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
 * @description Réapplique les textures lorsque l'utilisateur change de mode (réaliste/procédural).
 */
watch(textureMode, (mode) => applyTextures(mode))

/**
 * @description Libère les ressources Three.js (boucle d'animation, observateurs, mémoire GPU)
 * lorsque le composant est démonté, afin d'éviter les fuites mémoire.
 */
onUnmounted(() => {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  if (resizeObserver) resizeObserver.disconnect()
  if (controls) controls.dispose()
  // Libère les textures et matériaux shader (non libérés automatiquement par les matériaux).
  disposables.forEach((resource) => resource && resource.dispose())
  disposables = []
  // Le matériau de la Terre non attaché (selon le mode actif) n'est pas couvert par le traverse.
  if (earthStandardMaterial) earthStandardMaterial.dispose()
  if (earthShaderMaterial) earthShaderMaterial.dispose()
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
      <!-- Sélecteur de texture : réaliste (images CDN) ou procédurale (générée par code). -->
      <div class="mb-3 flex items-center justify-center gap-2">
        <span class="text-sm text-gray-500 mr-1">Textures :</span>
        <button
          type="button"
          class="tex-btn"
          :class="{ 'tex-btn--active': textureMode === 'realiste' }"
          @click="textureMode = 'realiste'"
        >
          Réalistes
        </button>
        <button
          type="button"
          class="tex-btn"
          :class="{ 'tex-btn--active': textureMode === 'procedural' }"
          @click="textureMode = 'procedural'"
        >
          Procédurales
        </button>
      </div>
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
/* Boutons du sélecteur de texture. Sélecteur de classe (spécificité supérieure au style global
   `button`) pour que les états actif/inactif soient correctement appliqués. */
.tex-btn {
  padding: 0.25rem 0.85rem;
  font-size: 0.875rem;
  background-color: #ffffff;
  color: #4b5563;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  transition: background-color 0.15s, color 0.15s;
}
.tex-btn:hover {
  background-color: #f3f4f6;
}
.tex-btn--active {
  background-color: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}
.tex-btn--active:hover {
  background-color: #2563eb;
}
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
