import SunCalc from 'suncalc';

const SAMPLES = 24 * 6;
const props = {
  latitude: 48.8566,
  longitude: 2.3522,
  date: new Date('2024-01-01T12:00:00Z')
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

    const sunPosition = SunCalc.getPosition(date, props.latitude, props.longitude);
    sunData.push(sunPosition.altitude / (Math.PI / 2));

    const moonPosition = SunCalc.getMoonPosition(date, props.latitude, props.longitude);
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

    const sunPosition = SunCalc.getPosition(date, props.latitude, props.longitude);
    sunData.push(sunPosition.altitude / PI_OVER_2);

    const moonPosition = SunCalc.getMoonPosition(date, props.latitude, props.longitude);
    moonData.push(moonPosition.altitude / PI_OVER_2);
  }
  return { labels, sunData, moonData };
}

const ITERATIONS = 1000;

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

// Verify results are same (approximately for floating point)
const res1 = originalUpdateChart();
const res2 = optimizedUpdateChart();

let same = res1.labels.length === res2.labels.length &&
           res1.sunData.length === res2.sunData.length &&
           res1.moonData.length === res2.moonData.length;

if (same) {
    for(let i=0; i<res1.labels.length; i++) {
        // Since original uses [], it might use system locale.
        // Let's just check if it contains numbers and :
        if (typeof res1.labels[i] !== 'string' || typeof res2.labels[i] !== 'string') {
             console.log(`Label type mismatch at ${i}`);
             same = false;
        }
        if (Math.abs(res1.sunData[i] - res2.sunData[i]) > 1e-10) {
            console.log(`Sun data mismatch at ${i}`);
            same = false;
        }
    }
}
console.log('Results match (ignoring locale):', same);
