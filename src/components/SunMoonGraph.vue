<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import SunCalc from 'suncalc'
import ModalComponent from './ModalComponent.vue'

// Enregistrement des composants et plugins Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
)

/**
 * @description Props du composant pour la latitude, la longitude et la date.
 * @type {Readonly<DefineProps<{latitude: number, longitude: number, date: object}>>}
 */
const props = defineProps({
  /**
   * La latitude pour le calcul de la position du soleil/lune.
   */
  latitude: {
    type: Number,
    required: true
  },
  /**
   * La longitude pour le calcul de la position du soleil/lune.
   */
  longitude: {
    type: Number,
    required: true
  },
  /**
   * La date pour laquelle les calculs sont effectués.
   */
  date: {
    type: Object,
    required: true
  }
})

// --- Gestion de la modale ---

/**
 * @type {import('vue').Ref<boolean>}
 * @description Contrôle la visibilité de la modale du graphique.
 */
const showModal = ref(false)

/**
 * @type {import('vue').Ref<boolean>}
 * @description Indique si le contenu de la modale est prêt à être affiché.
 */
const isModalReady = ref(false)

/**
 * @description Gère l'événement d'ouverture de la modale.
 */
const handleModalOpen = () => {
    isModalReady.value = true
}

/**
 * @description Gère l'événement de fermeture de la modale.
 */
const handleModalClose = () => {
    showModal.value = false
    isModalReady.value = false
}

// --- Données et options du graphique ---

/**
 * @type {import('vue').Ref<object>}
 * @description Données du graphique (labels, datasets pour le soleil et la lune).
 */
const chartData = ref({
  labels: [],
  datasets: [
    {
      label: 'Sun',
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255, 215, 0, 0.2)',
      data: [],
      fill: true,
      tension: 0.4,
      pointRadius: 0
    },
    {
      label: 'Moon',
      borderColor: '#B0C4DE',
      backgroundColor: 'rgba(176, 196, 222, 0.2)',
      data: [],
      fill: true,
      tension: 0.4,
      pointRadius: 0
    }
  ]
})

/**
 * @type {import('vue').Ref<object>}
 * @description Options de configuration pour le petit graphique (aperçu).
 */
const smallChartOptions = ref({})

/**
 * @type {import('vue').Ref<object>}
 * @description Options de configuration pour le grand graphique (modale).
 */
const largeChartOptions = ref({})

/**
 * @const {number}
 * @description Nombre d'échantillons de données à générer pour le graphique sur 24h (un toutes les 10 minutes).
 */
const SAMPLES = 24 * 6

/**
 * @description Convertit un objet Date en index correspondant sur l'axe des labels du graphique.
 * @param {Date} time - L'heure à convertir.
 * @returns {number} L'index correspondant.
 */
const timeToLabelIndex = (time) => {
  if (!time) return -1
  const startOfDay = new Date(props.date)
  startOfDay.setHours(0, 0, 0, 0)
  const minutes = (time.getTime() - startOfDay.getTime()) / 1000 / 60
  return Math.round(minutes / (24 * 60 / SAMPLES))
}

/**
 * @type {import('vue').Ref<number>}
 * @description Index actuel sur le graphique, correspondant à l'heure courante.
 */
const currentIndex = ref(0)

/**
 * @description Formate un objet Date en chaîne de caractères HH:MM.
 * @param {Date} date - L'objet Date à formater.
 * @returns {string} L'heure formatée.
 */
const formatTime = (date) => {
  if (!date) return ''
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * @description Met à jour les données et les options du graphique en fonction des props.
 */
function updateChart() {
  const labels = []
  const sunData = []
  const moonData = []
  const startOfDay = new Date(props.date)
  startOfDay.setHours(0, 0, 0, 0)

  // Génération des données d'altitude pour le soleil et la lune
  for (let i = 0; i < SAMPLES; i++) {
    const date = new Date(startOfDay.getTime() + i * (24 * 60 / SAMPLES) * 60 * 1000)
    labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

    const sunPosition = SunCalc.getPosition(date, props.latitude, props.longitude)
    sunData.push(sunPosition.altitude / (Math.PI / 2))

    const moonPosition = SunCalc.getMoonPosition(date, props.latitude, props.longitude)
    moonData.push(moonPosition.altitude / (Math.PI / 2))
  }

  chartData.value.labels = labels
  chartData.value.datasets[0].data = sunData
  chartData.value.datasets[1].data = moonData

  const times = SunCalc.getTimes(props.date, props.latitude, props.longitude)

  // Positionnement de l'indicateur de l'heure actuelle
  const now = new Date();
  if (now.toDateString() === props.date.toDateString()) {
    currentIndex.value = timeToLabelIndex(now);
  } else {
    currentIndex.value = -1; // Masquer si ce n'est pas aujourd'hui
  }

  // Création des annotations
  const baseAnnotations = {
    blueHourMorning: createBoxAnnotation(times.nauticalDawn, times.sunrise, 'rgba(30, 144, 255, 0.2)'),
    goldenHourMorning: createBoxAnnotation(times.sunrise, times.goldenHourEnd, 'rgba(255, 215, 0, 0.2)'),
    goldenHourEvening: createBoxAnnotation(times.goldenHour, times.sunset, 'rgba(255, 215, 0, 0.2)'),
    blueHourEvening: createBoxAnnotation(times.sunset, times.nauticalDusk, 'rgba(30, 144, 255, 0.2)')
  };

  const smallAnnotations = {
      ...baseAnnotations,
      sunriseLine: createLineAnnotation(times.sunrise, 'sunrise', 1),
      sunsetLine: createLineAnnotation(times.sunset, 'sunset', 1),
  };

  const largeAnnotations = {
      ...baseAnnotations,
      sunriseLine: createLineAnnotation(times.sunrise, 'sunrise', 2),
      sunriseLabel: createLabelAnnotation(times.sunrise, formatTime(times.sunrise), 'sunrise'),
      sunsetLine: createLineAnnotation(times.sunset, 'sunset', 2),
      sunsetLabel: createLabelAnnotation(times.sunset, formatTime(times.sunset), 'sunset'),
  };

  // Configuration des options de base pour les graphiques
  const baseChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    elements: { point: { radius: 0 } }
  }

  // Options spécifiques pour le petit graphique
  smallChartOptions.value = {
    ...baseChartOptions,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { display: false } },
      y: { grid: { display: false }, ticks: { display: false }, min: -0.8, max: 1 }
    },
    plugins: {
      ...baseChartOptions.plugins,
      annotation: { annotations: smallAnnotations }
    }
  }

  // Options spécifiques pour le grand graphique
  largeChartOptions.value = {
    ...baseChartOptions,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: true }, ticks: { display: true, autoSkip: true, maxTicksLimit: 12 } },
      y: {
        grid: { display: true },
        ticks: {
            display: true,
            callback: function(value) {
                if (value === 1) return 'Zenith';
                if (value === 0) return 'Horizon';
                if (value === -1) return 'Nadir';
                return null;
            }
        },
        min: -1,
        max: 1
      }
    },
    plugins: {
      ...baseChartOptions.plugins,
      tooltip: { enabled: true },
      legend: { display: true },
      annotation: { annotations: largeAnnotations }
    }
  }
}

/**
 * @description Crée une annotation de type 'box' pour le graphique.
 * @param {Date} start - Heure de début de la box.
 * @param {Date} end - Heure de fin de la box.
 * @param {string} color - Couleur de fond de la box.
 * @returns {object} Objet de configuration de l'annotation.
 */
function createBoxAnnotation(start, end, color) {
  const startIndex = timeToLabelIndex(start);
  const endIndex = timeToLabelIndex(end);
  if (startIndex === -1 || endIndex === -1 || !chartData.value.labels[Math.min(startIndex, endIndex)] || !chartData.value.labels[Math.max(startIndex, endIndex)]) return {};
  return {
    type: 'box',
    xMin: chartData.value.labels[Math.min(startIndex, endIndex)],
    xMax: chartData.value.labels[Math.max(startIndex, endIndex)],
    backgroundColor: color,
    borderColor: 'transparent'
  }
}

/**
 * @description Crée une annotation de type 'line' pour le graphique.
 * @param {Date} time - Heure à laquelle tracer la ligne.
 * @param {string} type - Type de ligne ('sunrise' ou 'sunset').
 * @param {number} width - Épaisseur de la ligne.
 * @returns {object} Objet de configuration de l'annotation.
 */
function createLineAnnotation(time, type, width) {
    const index = timeToLabelIndex(time);
    if (index === -1) return {};
    return {
        type: 'line',
        scaleID: 'x',
        value: chartData.value.labels[index],
        borderColor: type === 'sunrise' ? 'rgba(255, 165, 0, 0.8)' : 'rgba(255, 69, 0, 0.8)',
        borderWidth: width,
        borderDash: [5, 5],
    };
}

/**
 * @description Crée une annotation de type 'label' pour le graphique.
 * @param {Date} time - Heure à laquelle positionner le label.
 * @param {string} content - Contenu texte du label.
 * @param {string} type - Type de label ('sunrise' ou 'sunset') pour ajustement.
 * @returns {object} Objet de configuration de l'annotation.
 */
function createLabelAnnotation(time, content, type) {
    const index = timeToLabelIndex(time);
    if (index === -1) return {};
    return {
        type: 'label',
        xValue: chartData.value.labels[index],
        yValue: 0.95,
        content: content,
        font: { size: 12, weight: 'bold' },
        color: '#333',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: 4,
        borderRadius: 4,
        xAdjust: type === 'sunrise' ? 20 : -20,
    };
}

/**
 * @description Calcule la position (top, left) d'une icône sur le graphique en fonction de son index et des données Y.
 * @param {number} index - Index de la donnée sur l'axe X.
 * @param {Array<number>} yData - Tableau des données de l'axe Y.
 * @returns {object} Objet de style CSS pour la position.
 */
const getIconPosition = (index, yData) => {
    if (index < 0 || index >= SAMPLES || !yData || yData.length === 0 || !smallChartOptions.value.scales) return { display: 'none' };
    const yValue = yData[index];
    const yMin = smallChartOptions.value.scales.y.min;
    const yMax = smallChartOptions.value.scales.y.max;
    const top = `${(1 - (yValue - yMin) / (yMax - yMin)) * 100}%`;
    const left = `${(index / (SAMPLES - 1)) * 100}%`;
    return { top, left, transform: 'translate(-50%, -50%)' };
};

/**
 * @type {import('vue').ComputedRef<object>}
 * @description Calcule la position de l'icône de l'heure actuelle sur le graphique.
 */
const currentPosition = computed(() => getIconPosition(currentIndex.value, chartData.value.datasets[0].data));

/**
 * @description Surveille les changements des props pour mettre à jour le graphique.
 */
watch(() => [props.latitude, props.longitude, props.date], updateChart, { immediate: true })

/**
 * @description Met à jour le graphique lors du montage initial du composant.
 */
onMounted(() => {
  updateChart()
})

</script>

<template>
  <div>
    <div class="graph-container" @click="showModal = true">
      <Line :data="chartData" :options="smallChartOptions" />
      <div v-if="currentIndex !== -1" class="icon-overlay" :style="currentPosition" title="Current Time">
          <div class="w-2 h-2 bg-red-500 rounded-full"></div>
      </div>
    </div>

    <teleport to="body">
        <ModalComponent v-if="showModal" @close="handleModalClose" @open="handleModalOpen">
            <div class="large-graph-container">
                <Line :data="chartData" :options="largeChartOptions" />
            </div>
        </ModalComponent>
    </teleport>
  </div>
</template>

<style scoped>
.graph-container {
  width: 150px;
  height: 75px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}
.graph-container:hover {
    transform: scale(1.15);
}
.icon-overlay {
    position: absolute;
    pointer-events: none; /* Make sure icons don't block clicks on the graph */
}
.large-graph-container {
    height: 60vh;
    width: 80vw;
}
</style>
