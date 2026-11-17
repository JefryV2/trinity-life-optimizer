import type { SleepRecord } from '@/features/health/use-health';

export type CircadianSummary = {
  avgBedtime: number;
  avgWake: number;
  midpoint: number;
  avgDuration: number;
  bedtimeVariationMinutes: number;
  midpointVariationMinutes: number;
  consistencyScore: number;
  consistencyLabel: string;
  sampleSize: number;
};

const DAY = 24;

const clockHours = (value: string): number | null => {
  // Postgres `time` columns arrive as "22:45:00", while the app also stores
  // full ISO timestamps. Read time-only digits directly, and let Date handle
  // timestamps so the device's timezone is respected.
  const timeOnly = value.match(/^(\d{1,2}):(\d{2})/);
  if (timeOnly) return Number(timeOnly[1]) + Number(timeOnly[2]) / 60;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() + date.getMinutes() / 60;
};

/** Bedtimes before noon belong to the previous evening, so normalise them past 24. */
const bedtimeHours = (hours: number): number => (hours < 12 ? hours + DAY : hours);

const wrap = (hours: number): number => ((hours % DAY) + DAY) % DAY;

const circularDiff = (a: number, b: number): number => {
  const diff = wrap(a - b);
  return diff > DAY / 2 ? diff - DAY : diff;
};

const circularMean = (values: number[]): number => {
  const x = values.reduce((sum, value) => sum + Math.cos((value / DAY) * Math.PI * 2), 0);
  const y = values.reduce((sum, value) => sum + Math.sin((value / DAY) * Math.PI * 2), 0);
  return wrap((Math.atan2(y, x) / (Math.PI * 2)) * DAY);
};

const standardDeviation = (values: number[], mean: number): number => {
  if (values.length === 0) return 0;
  const variance =
    values.reduce((sum, value) => sum + circularDiff(value, mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export const formatClock = (hours: number): string => {
  const normalized = wrap(hours);
  const whole = Math.floor(normalized);
  const minutes = Math.round((normalized - whole) * 60);
  const safeHour = minutes === 60 ? (whole + 1) % DAY : whole;
  const safeMinute = minutes === 60 ? 0 : minutes;
  return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
};

export const circadianSummary = (records: SleepRecord[]): CircadianSummary | null => {
  const rows = records
    .map((record) => {
      if (!record.bedtime || !record.wake_time) return null;
      const bed = clockHours(record.bedtime);
      const wake = clockHours(record.wake_time);
      if (bed === null || wake === null) return null;
      const bedNorm = bedtimeHours(bed);
      const wakeNorm = wake <= bedNorm ? wake + DAY : wake;
      const recorded = record.sleep_duration_hours;
      const duration =
        recorded && recorded > 0 && recorded < 16 ? recorded : Math.max(0, wakeNorm - bedNorm);
      return {
        bed: bedNorm,
        wake: wakeNorm,
        duration,
        midpoint: wrap(bedNorm + duration / 2),
      };
    })
    .filter((row): row is { bed: number; wake: number; duration: number; midpoint: number } => Boolean(row));

  if (rows.length === 0) return null;

  const avgBedtime = wrap(
    rows.reduce((sum, row) => sum + row.bed, 0) / rows.length,
  );
  const avgWake = wrap(rows.reduce((sum, row) => sum + row.wake, 0) / rows.length);
  const avgDuration = rows.reduce((sum, row) => sum + row.duration, 0) / rows.length;
  const midpoint = circularMean(rows.map((row) => row.midpoint));
  const bedtimeSd = standardDeviation(rows.map((row) => wrap(row.bed)), avgBedtime);
  const midpointSd = standardDeviation(rows.map((row) => row.midpoint), midpoint);
  const consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - midpointSd * 120)));

  return {
    avgBedtime,
    avgWake,
    midpoint,
    avgDuration,
    bedtimeVariationMinutes: Math.round(bedtimeSd * 60),
    midpointVariationMinutes: Math.round(midpointSd * 60),
    consistencyScore,
    consistencyLabel:
      midpointSd <= 20 / 60
        ? 'Steady rhythm'
        : midpointSd <= 45 / 60
          ? 'Fairly steady'
          : 'Variable rhythm',
    sampleSize: rows.length,
  };
};
