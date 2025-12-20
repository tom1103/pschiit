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
import SunIcon from './SunIcon.vue'
import ModalComponent from './ModalComponent.vue'

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

const props = defineProps({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  date: {
    type: Object,
    required: true
  }
})

const showModal = ref(false)
const isModalReady = ref(false)

const handleModalOpen = () => {
    isModalReady.value = true
}

const handleModalClose = () => {
    showModal.value = false
    isModalReady.value = false
}

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

const smallChartOptions = ref({})
const largeChartOptions = ref({})

const SAMPLES = 24 * 6 // Every 10 minutes

const timeToLabelIndex = (time) => {
  if (!time) return -1
  const startOfDay = new Date(props.date)
  startOfDay.setHours(0, 0, 0, 0)
  const minutes = (time.getTime() - startOfDay.getTime()) / 1000 / 60
  return Math.round(minutes / (24 * 60 / SAMPLES))
}

const sunriseIndex = ref(0)
const sunsetIndex = ref(0)
const currentIndex = ref(0)

function updateChart() {
  const labels = []
  const sunData = []
  const moonData = []
  const startOfDay = new Date(props.date)
  startOfDay.setHours(0, 0, 0, 0)

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

  sunriseIndex.value = timeToLabelIndex(times.sunrise)
  sunsetIndex.value = timeToLabelIndex(times.sunset)
  const now = new Date();
  if (now.toDateString() === props.date.toDateString()) {
    currentIndex.value = timeToLabelIndex(now);
  } else {
    currentIndex.value = -1; // Hide if not today
  }


  const annotations = {
    blueHourMorning: createAnnotation(times.nauticalDawn, times.sunrise, 'rgba(30, 144, 255, 0.2)'),
    goldenHourMorning: createAnnotation(times.sunrise, times.goldenHourEnd, 'rgba(255, 215, 0, 0.2)'),
    goldenHourEvening: createAnnotation(times.goldenHour, times.sunset, 'rgba(255, 215, 0, 0.2)'),
    blueHourEvening: createAnnotation(times.sunset, times.nauticalDusk, 'rgba(30, 144, 255, 0.2)')
  }

  const baseChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      annotation: { annotations }
    },
    elements: { point: { radius: 0 } }
  }

  smallChartOptions.value = {
    ...baseChartOptions,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { display: false } },
      y: { grid: { display: false }, ticks: { display: false }, min: -0.8, max: 1 }
    }
  }

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
      legend: { display: true }
    }
  }
}

function createAnnotation(start, end, color) {
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

const getIconPosition = (index, yData) => {
    if (index < 0 || index >= SAMPLES || !yData || yData.length === 0 || !smallChartOptions.value.scales) return { display: 'none' };
    const yValue = yData[index];
    const yMin = smallChartOptions.value.scales.y.min;
    const yMax = smallChartOptions.value.scales.y.max;
    const top = `${(1 - (yValue - yMin) / (yMax - yMin)) * 100}%`;
    const left = `${(index / (SAMPLES - 1)) * 100}%`;
    return { top, left, transform: 'translate(-50%, -50%)' };
};

const sunrisePosition = computed(() => getIconPosition(sunriseIndex.value, chartData.value.datasets[0].data));
const sunsetPosition = computed(() => getIconPosition(sunsetIndex.value, chartData.value.datasets[0].data));
const currentPosition = computed(() => getIconPosition(currentIndex.value, chartData.value.datasets[0].data));


watch(() => [props.latitude, props.longitude, props.date], updateChart, { immediate: true })

onMounted(() => {
  updateChart()
})

</script>

<template>
  <div>
    <div class="graph-container" @click="showModal = true">
      <Line :data="chartData" :options="smallChartOptions" />
      <div class="icon-overlay" :style="sunrisePosition" title="Sunrise">
          <SunIcon name="sunrise" />
      </div>
      <div class="icon-overlay" :style="sunsetPosition" title="Sunset">
          <SunIcon name="sunset" />
      </div>
      <div v-if="currentIndex !== -1" class="icon-overlay" :style="currentPosition" title="Current Time">
          <div class="w-2 h-2 bg-red-500 rounded-full"></div>
      </div>
    </div>

    <teleport to="body">
        <ModalComponent v-if="showModal" @close="handleModalClose" @open="handleModalOpen">
            <div class="large-graph-container">
                <Line v-if="isModalReady" :data="chartData" :options="largeChartOptions" />
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
