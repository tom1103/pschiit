const SAMPLES = 24 * 6;
const props = {
  latitude: 48.8566,
  longitude: 2.3522,
  date: new Date('2024-01-01T12:00:00Z')
};

const SunCalcMock = {
    getPosition: (date, lat, lon) => ({ altitude: 0.5 }),
    getMoonPosition: (date, lat, lon) => ({ altitude: 0.2 })
};

function originalUpdateChart() {
  const labels = [];
  const sunData = [];
  const moonData = [];
  const startOfDay = new Date(props.date);
  startOfDay.setHours(0, 0, 0, 0);

  for (let i = 0; i < SAMPLES; i++) {
    const date = new Date(startOfDay.getTime() + i * ((24 * 60) / SAMPLES) * 60 * 1000);
    labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const sunPosition = SunCalcMock.getPosition(date, props.latitude, props.longitude);
    sunData.push(sunPosition.altitude / (Math.PI / 2));

    const moonPosition = SunCalcMock.getMoonPosition(date, props.latitude, props.longitude);
    moonData.push(moonPosition.altitude / (Math.PI / 2));
  }
  return { labels, sunData, moonData };
}

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

const PI_OVER_2 = Math.PI / 2;
const INTERVAL_MS = ((24 * 60) / SAMPLES) * 60 * 1000;

function optimizedUpdateChart() {
  const labels = [];
  const sunData = [];
  const moonData = [];
  const startOfDay = new Date(props.date);
  startOfDay.setHours(0, 0, 0, 0);
  const startTime = startOfDay.getTime();

  const date = new Date(startTime);

  for (let i = 0; i < SAMPLES; i++) {
    date.setTime(startTime + i * INTERVAL_MS);
    labels.push(timeFormat.format(date));

    const sunPosition = SunCalcMock.getPosition(date, props.latitude, props.longitude);
    sunData.push(sunPosition.altitude / PI_OVER_2);

    const moonPosition = SunCalcMock.getMoonPosition(date, props.latitude, props.longitude);
    moonData.push(moonPosition.altitude / PI_OVER_2);
  }
  return { labels, sunData, moonData };
}

const ITERATIONS = 1000;

// Warm up
for (let i = 0; i < 100; i++) {
    originalUpdateChart();
    optimizedUpdateChart();
}

console.time('Original');
for (let i = 0; i < ITERATIONS; i++) {
  originalUpdateChart();
}
console.timeEnd('Original');

console.time('Optimized');
for (let i = 0; i < ITERATIONS; i++) {
  optimizedUpdateChart();
}
console.timeEnd('Optimized');

// Verify results match (ignoring locale differences in labels)
const res1 = originalUpdateChart();
const res2 = optimizedUpdateChart();
console.log('Labels length:', res1.labels.length, res2.labels.length);
console.log('Sample label 0:', res1.labels[0], 'vs', res2.labels[0]);
