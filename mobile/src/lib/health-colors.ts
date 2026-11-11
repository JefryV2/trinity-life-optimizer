/**
 * Safety scales for environmental readings.
 *
 * The colour changes gradually with the value instead of snapping at a single
 * threshold, so "good" reads teal, "moderate" lime/amber, "bad" orange, and
 * "dangerous" red/violet. Each stop is a real reading, not a generic bucket.
 */

type Stop = { at: number; color: string };

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' +
  [r, g, b]
    .map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0'))
    .join('');

const mix = (from: string, to: string, t: number): string => {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};

const sample = (stops: Stop[], value: number): string => {
  if (value <= stops[0].at) return stops[0].color;
  const last = stops[stops.length - 1];
  if (value >= last.at) return last.color;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (value >= a.at && value <= b.at) {
      const t = (value - a.at) / (b.at - a.at);
      return mix(a.color, b.color, t);
    }
  }
  return last.color;
};

/** UV index: 0–2 low, 3–5 moderate, 6–7 high, 8–10 very high, 11+ extreme. */
const UV_STOPS: Stop[] = [
  { at: 0, color: '#3CE9C2' },
  { at: 2, color: '#C6F24E' },
  { at: 5, color: '#FFB020' },
  { at: 7, color: '#FF8A3D' },
  { at: 10, color: '#FF6B5A' },
  { at: 12, color: '#B04BFF' },
];

/** OpenWeather air quality index: 1 good → 5 very poor. */
const AQI_STOPS: Stop[] = [
  { at: 1, color: '#3CE9C2' },
  { at: 2, color: '#C6F24E' },
  { at: 3, color: '#FFB020' },
  { at: 4, color: '#FF8A3D' },
  { at: 5, color: '#FF6B5A' },
];

const FALLBACK = '#8A8A92';

/** PM2.5 in µg/m³: 0–12 good, 12–35 moderate, 35–55 unhealthy, 55–150 very unhealthy. */
const PM25_STOPS: Stop[] = [
  { at: 0, color: '#3CE9C2' },
  { at: 12, color: '#C6F24E' },
  { at: 35, color: '#FFB020' },
  { at: 55, color: '#FF8A3D' },
  { at: 150, color: '#FF6B5A' },
  { at: 250, color: '#B04BFF' },
];

export const uvColor = (uv: number | null): string =>
  uv === null ? FALLBACK : sample(UV_STOPS, uv);

export const pm25Color = (pm25: number | null): string =>
  pm25 === null ? FALLBACK : sample(PM25_STOPS, pm25);

export const aqiColor = (aqi: number | null): string =>
  aqi === null ? FALLBACK : sample(AQI_STOPS, aqi);

export const uvLabel = (uv: number | null): string => {
  if (uv === null) return 'Unavailable';
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very high';
  return 'Extreme';
};

export const aqiLabel = (aqi: number | null): string => {
  if (aqi === null) return 'Unavailable';
  return ['Good', 'Fair', 'Moderate', 'Poor', 'Very poor'][aqi - 1] ?? 'Unknown';
};

/** Mood 1–10: low is danger, high is calm. */
const MOOD_STOPS: Stop[] = [
  { at: 1, color: '#FF6B5A' },
  { at: 4, color: '#FFB020' },
  { at: 7, color: '#C6F24E' },
  { at: 10, color: '#3CE9C2' },
];

export const moodColor = (mood: number): string => sample(MOOD_STOPS, mood);
