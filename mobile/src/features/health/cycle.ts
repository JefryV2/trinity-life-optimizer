import type { CycleRecord } from '@/features/health/use-health';
import { addDays, daysBetween, isoDate } from '@/lib/format';

export type CyclePhaseKey = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type CyclePhase = {
  key: CyclePhaseKey;
  name: string;
  note: string;
};

export type CycleStats = {
  averageLength: number;
  averagePeriod: number;
  shortest: number;
  longest: number;
  variation: number;
  regularity: string;
  sampleSize: number;
};

const validLength = (days: number) => days >= 21 && days <= 45;

export const periodDaysFor = (cycle: CycleRecord, fallback = 5): number => {
  if (cycle.cycle_end_date) {
    return Math.max(1, Math.min(14, daysBetween(cycle.cycle_start_date, cycle.cycle_end_date) + 1));
  }
  return cycle.period_length_days ?? fallback;
};

export const cycleStats = (
  cycles: CycleRecord[],
  fallbackLength = 28,
  fallbackPeriod = 5,
): CycleStats => {
  const starts = cycles
    .map((cycle) => cycle.cycle_start_date)
    .filter(Boolean)
    .sort();

  const intervals = starts
    .slice(1)
    .map((start, index) => daysBetween(starts[index], start))
    .filter(validLength);

  const periods = cycles
    .map((cycle) => periodDaysFor(cycle, fallbackPeriod))
    .filter((days) => days >= 1 && days <= 14);

  const averageLength = intervals.length
    ? Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length)
    : fallbackLength;
  const averagePeriod = periods.length
    ? Math.round(periods.reduce((sum, days) => sum + days, 0) / periods.length)
    : fallbackPeriod;
  const shortest = intervals.length ? Math.min(...intervals) : averageLength;
  const longest = intervals.length ? Math.max(...intervals) : averageLength;
  const variation = longest - shortest;

  const regularity =
    intervals.length < 2
      ? 'Building history'
      : variation <= 4
        ? 'Regular'
        : variation <= 7
          ? 'Slightly variable'
          : 'Variable';

  return {
    averageLength,
    averagePeriod,
    shortest,
    longest,
    variation,
    regularity,
    sampleSize: intervals.length,
  };
};

/** Cycle day 1 is the first day of bleeding. */
export const phaseAt = (cycleDay: number, cycleLength: number, periodLength: number): CyclePhase => {
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
  if (cycleDay <= periodLength) {
    return { key: 'menstrual', name: 'Menstrual', note: 'Lower energy. Rest and iron-rich food help.' };
  }
  if (cycleDay < ovulationDay - 1) {
    return { key: 'follicular', name: 'Follicular', note: 'Energy is rising. Good time to build momentum.' };
  }
  if (cycleDay <= ovulationDay + 2) {
    return { key: 'ovulation', name: 'Ovulation', note: 'Estimated peak fertility and energy.' };
  }
  return { key: 'luteal', name: 'Luteal', note: 'Energy is winding down. Protect sleep and recovery.' };
};

export const ovulationDayFor = (cycleLength: number, periodLength: number) =>
  Math.max(periodLength + 2, cycleLength - 14);

export const shiftIso = (date: string, days: number): string =>
  isoDate(addDays(new Date(`${date}T12:00:00`), days));

export const isoRange = (start: string, end: string): string[] => {
  const days = Math.max(0, daysBetween(start, end));
  return Array.from({ length: days + 1 }, (_value, index) => shiftIso(start, index));
};

export const flowLabel = (flow: string | null | undefined) => {
  if (flow === 'light') return 'Light';
  if (flow === 'moderate' || flow === 'medium') return 'Medium';
  if (flow === 'heavy') return 'Heavy';
  return 'None';
};
