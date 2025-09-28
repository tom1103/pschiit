<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';

const props = defineProps({
  longitude: {
    type: Number,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  zoom: {
    type: Number,
    default: 9
  },
  mapStyle: {
    type: String,
    default: 'mapbox://styles/tom1103/cjfhz8z59dz0h2ro7k8l43pow'
  }
});

const mapContainer = ref(null);
let map = null;
let marker = null;

onMounted(() => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: props.mapStyle,
    center: [props.longitude, props.latitude],
    zoom: props.zoom
  });

  marker = new mapboxgl.Marker()
    .setLngLat([props.longitude, props.latitude])
    .addTo(map);
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});

watch(() => [props.longitude, props.latitude], (newLngLat) => {
  if (map) {
    map.flyTo({
      center: newLngLat,
      essential: true
    });
    if (marker) {
      marker.setLngLat(newLngLat);
    }
  }
});

watch(() => props.zoom, (newZoom) => {
  if (map) {
    map.flyTo({
      zoom: newZoom,
      essential: true
    });
  }
});

watch(() => props.mapStyle, (newStyle) => {
  if (map) {
    map.setStyle(newStyle);
  }
});

</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 500px;
}
</style>
