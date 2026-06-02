/**
 * @file Génération des textures des astres : soit réalistes (téléchargées depuis le CDN officiel
 * de Three.js), soit procédurales (dessinées par code sur un canvas). Chaque générateur produit
 * une texture de couleur ainsi qu'une carte de relief (bump/displacement) en niveaux de gris.
 */

/**
 * @description URLs des textures réalistes. Ce sont les assets planétaires officiels du dépôt
 * Three.js, servis avec les en-têtes CORS nécessaires à un chargement cross-origin. Le rendu
 * « réaliste » s'inspire de la leçon « Earth Shaders » de Three.js Journey : jour, nuit (lumières
 * des villes), nuages et masque spéculaire des océans sont combinés dans un shader dédié.
 * @type {{earthMap: string, earthNight: string, earthNormal: string, earthSpecular: string,
 *   earthClouds: string, moonMap: string}}
 */
export const CDN_TEXTURES = {
  earthMap: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
  earthNight: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
  earthNormal: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
  earthSpecular: 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
  earthClouds: 'https://threejs.org/examples/textures/planets/earth_clouds_2048.png',
  moonMap: 'https://threejs.org/examples/textures/planets/moon_1024.jpg',
}

/**
 * @description Crée un élément <canvas> hors écran aux dimensions voulues.
 * @param {number} width - Largeur en pixels.
 * @param {number} height - Hauteur en pixels.
 * @returns {HTMLCanvasElement}
 */
function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * @description Construit une fonction de bruit fractal (fBm) à partir d'un bruit de valeur
 * interpolé bilinéairement sur une grille aléatoire. Sert à générer des continents, du relief
 * et des granulations d'aspect organique. Le résultat est dans l'intervalle [0, 1].
 * @param {number} [size=256] - Taille (puissance de 2) de la grille de bruit de base.
 * @returns {(x: number, y: number) => number} Fonction de bruit fractal.
 */
function buildValueNoise(size = 256) {
  const grid = new Float32Array(size * size)
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random()

  // Lecture de la grille avec rebouclage (& size-1) : la grille est cyclique.
  const at = (x, y) => grid[(y & (size - 1)) * size + (x & (size - 1))]
  // Courbe d'adoucissement (smoothstep) pour une interpolation douce.
  const smooth = (t) => t * t * (3 - 2 * t)

  const sample = (x, y) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = smooth(x - x0)
    const fy = smooth(y - y0)
    const v00 = at(x0, y0)
    const v10 = at(x0 + 1, y0)
    const v01 = at(x0, y0 + 1)
    const v11 = at(x0 + 1, y0 + 1)
    const a = v00 + (v10 - v00) * fx
    const b = v01 + (v11 - v01) * fx
    return a + (b - a) * fy
  }

  // Somme de plusieurs octaves (fréquence doublée, amplitude divisée par 2) → aspect fractal.
  return (x, y) => {
    let amplitude = 1
    let frequency = 1
    let sum = 0
    let norm = 0
    for (let octave = 0; octave < 5; octave++) {
      sum += sample(x * frequency, y * frequency) * amplitude
      norm += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return sum / norm
  }
}

/**
 * @description Génère par code la texture de la Terre : océans, continents (vert→brun selon
 * l'altitude) et calottes polaires, accompagnée d'une carte de relief en niveaux de gris.
 * @param {number} [width=1024] - Largeur des textures.
 * @param {number} [height=512] - Hauteur des textures.
 * @returns {{map: HTMLCanvasElement, bump: HTMLCanvasElement}|null} Les canvas, ou null si le
 * contexte 2D n'est pas disponible (ex. environnement de test sans canvas).
 */
export function createEarthTextures(width = 1024, height = 512) {
  const mapCanvas = createCanvas(width, height)
  const bumpCanvas = createCanvas(width, height)
  const mapCtx = mapCanvas.getContext('2d')
  const bumpCtx = bumpCanvas.getContext('2d')
  if (!mapCtx || !bumpCtx) return null

  const noise = buildValueNoise()
  const mapImg = mapCtx.createImageData(width, height)
  const bumpImg = bumpCtx.createImageData(width, height)

  for (let y = 0; y < height; y++) {
    // Latitude normalisée [-1, 1] pour placer les calottes polaires.
    const lat = (y / height) * 2 - 1
    const polar = Math.abs(lat)
    for (let x = 0; x < width; x++) {
      const n = noise((x / width) * 8, (y / height) * 4)
      const idx = (y * width + x) * 4

      let r
      let g
      let b
      let h // hauteur (niveau de gris de la carte de relief)

      if (n > 0.52) {
        // Terre émergée : du vert (plaine) au brun (montagne) selon l'élévation.
        const elev = (n - 0.52) / 0.48
        r = 60 + elev * 120
        g = 120 - elev * 45
        b = 60 - elev * 30
        h = 150 + elev * 105
      } else {
        // Océan : plus c'est profond, plus c'est sombre.
        const depth = n / 0.52
        r = 10 + depth * 20
        g = 45 + depth * 55
        b = 90 + depth * 110
        h = 60 + depth * 40
      }

      // Calottes polaires : fondu vers le blanc au-delà de ±82° de latitude.
      if (polar > 0.82) {
        const t = (polar - 0.82) / 0.18
        r += (245 - r) * t
        g += (245 - g) * t
        b += (255 - b) * t
        h += (235 - h) * t
      }

      mapImg.data[idx] = r
      mapImg.data[idx + 1] = g
      mapImg.data[idx + 2] = b
      mapImg.data[idx + 3] = 255

      bumpImg.data[idx] = h
      bumpImg.data[idx + 1] = h
      bumpImg.data[idx + 2] = h
      bumpImg.data[idx + 3] = 255
    }
  }

  mapCtx.putImageData(mapImg, 0, 0)
  bumpCtx.putImageData(bumpImg, 0, 0)
  return { map: mapCanvas, bump: bumpCanvas }
}

/**
 * @description Génère par code la texture de la Lune : régolithe gris légèrement bruité, parsemé
 * de cratères (fond sombre, rebord clair), avec sa carte de relief associée.
 * @param {number} [width=1024] - Largeur des textures.
 * @param {number} [height=512] - Hauteur des textures.
 * @returns {{map: HTMLCanvasElement, bump: HTMLCanvasElement}|null} Les canvas, ou null si le
 * contexte 2D n'est pas disponible.
 */
export function createMoonTextures(width = 1024, height = 512) {
  const mapCanvas = createCanvas(width, height)
  const bumpCanvas = createCanvas(width, height)
  const mapCtx = mapCanvas.getContext('2d')
  const bumpCtx = bumpCanvas.getContext('2d')
  if (!mapCtx || !bumpCtx) return null

  const noise = buildValueNoise()
  const mapImg = mapCtx.createImageData(width, height)
  const bumpImg = bumpCtx.createImageData(width, height)

  // Fond : gris régolithe modulé par un léger bruit (mers lunaires plus sombres).
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = noise((x / width) * 6, (y / height) * 3)
      const idx = (y * width + x) * 4
      const grey = 95 + n * 70
      mapImg.data[idx] = grey
      mapImg.data[idx + 1] = grey
      mapImg.data[idx + 2] = grey * 0.97
      mapImg.data[idx + 3] = 255
      bumpImg.data[idx] = grey
      bumpImg.data[idx + 1] = grey
      bumpImg.data[idx + 2] = grey
      bumpImg.data[idx + 3] = 255
    }
  }
  mapCtx.putImageData(mapImg, 0, 0)
  bumpCtx.putImageData(bumpImg, 0, 0)

  // Cratères : dégradés radiaux superposés (fond creusé sombre, bourrelet clair surélevé).
  const craterCount = 150
  for (let i = 0; i < craterCount; i++) {
    const radius = 4 + Math.random() * Math.random() * 42
    const cx = Math.random() * width
    const cy = Math.random() * height

    const mapGrad = mapCtx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    mapGrad.addColorStop(0, 'rgba(40, 40, 44, 0.55)')
    mapGrad.addColorStop(0.7, 'rgba(120, 120, 124, 0)')
    mapGrad.addColorStop(0.86, 'rgba(225, 225, 228, 0.45)')
    mapGrad.addColorStop(1, 'rgba(120, 120, 124, 0)')
    mapCtx.fillStyle = mapGrad
    mapCtx.beginPath()
    mapCtx.arc(cx, cy, radius, 0, Math.PI * 2)
    mapCtx.fill()

    // Même structure sur la carte de relief : creux sombre, rebord clair.
    const bumpGrad = bumpCtx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    bumpGrad.addColorStop(0, 'rgba(20, 20, 20, 0.6)')
    bumpGrad.addColorStop(0.7, 'rgba(128, 128, 128, 0)')
    bumpGrad.addColorStop(0.86, 'rgba(240, 240, 240, 0.5)')
    bumpGrad.addColorStop(1, 'rgba(128, 128, 128, 0)')
    bumpCtx.fillStyle = bumpGrad
    bumpCtx.beginPath()
    bumpCtx.arc(cx, cy, radius, 0, Math.PI * 2)
    bumpCtx.fill()
  }

  return { map: mapCanvas, bump: bumpCanvas }
}

/**
 * @description Génère par code la texture du Soleil : surface incandescente (jaune→orange) avec
 * granulation et taches plus sombres, destinée à un matériau émissif.
 * @param {number} [width=1024] - Largeur de la texture.
 * @param {number} [height=512] - Hauteur de la texture.
 * @returns {{map: HTMLCanvasElement, bump: null}|null} Le canvas de couleur, ou null si le
 * contexte 2D n'est pas disponible.
 */
export function createSunTextures(width = 1024, height = 512) {
  const mapCanvas = createCanvas(width, height)
  const mapCtx = mapCanvas.getContext('2d')
  if (!mapCtx) return null

  const noise = buildValueNoise()
  const mapImg = mapCtx.createImageData(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = noise((x / width) * 10, (y / height) * 5)
      const idx = (y * width + x) * 4
      // Plasma : du jaune vif (zones chaudes) vers l'orange (granulation plus froide).
      mapImg.data[idx] = 255
      mapImg.data[idx + 1] = 150 + n * 95
      mapImg.data[idx + 2] = 30 + n * 60
      mapImg.data[idx + 3] = 255
    }
  }
  mapCtx.putImageData(mapImg, 0, 0)

  return { map: mapCanvas, bump: null }
}
