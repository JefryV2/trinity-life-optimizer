/**
 * Weekly experiments.
 *
 * An experiment is one lever, held for seven days, then judged against the
 * snapshots that were recorded anyway. Nothing here stores a verdict: the
 * verdict is recomputed from the days, so it can never drift from the data.
 */

export type LeverKey = 'sleep' | 'steps' | 'water' | 'exercise' | 'savings' | 'contact';

export type MetricKey =
  | 'sleep_hours'
  | 'steps'
  | 'water_ml'
  | 'exercise_min'
  | 'savings_rate'
  | 'interactions';

export interface Lever {
  key: LeverKey;
  label: string;
  pillar: 'health' | 'wealth' | 'bonds';
  /** The rule, in words, e.g. "7 hours or more". */
  rule: string;
  metric: MetricKey;
  threshold: number;
  /** Why this is worth a week. */
  rationale: string;
}

export const LEVERS: Lever[] = [
  {
    key: 'sleep',
    label: 'Sleep 7h+',
    pillar: 'health',
    rule: '7 hours or more',
    metric: 'sleep_hours',
    threshold: 7,
    rationale: 'The most-repeated finding in the app: short nights drag mood and the health score together.',
  },
  {
    key: 'steps',
    label: 'Walk 8,000',
    pillar: 'health',
    rule: '8,000 steps or more',
    metric: 'steps',
    threshold: 8000,
    rationale: 'Movement is the easiest lever to hold for a week and the easiest to verify.',
  },
  {
    key: 'water',
    label: 'Hit water target',
    pillar: 'health',
    rule: 'the daily water target',
    metric: 'water_ml',
    threshold: 2500,
    rationale: 'A small, daily, fully within-your-control input.',
  },
  {
    key: 'exercise',
    label: '20 active minutes',
    pillar: 'health',
    rule: '20 minutes or more',
    metric: 'exercise_min',
    threshold: 20,
    rationale: 'Short sessions are more likely to survive a real week than long ones.',
  },
  {
    key: 'savings',
    label: 'Save 20%',
    pillar: 'wealth',
    rule: '20% savings rate or more',
    metric: 'savings_rate',
    threshold: 20,
    rationale: 'Saving is the strongest single input in the wealth score.',
  },
  {
    key: 'contact',
    label: 'Reach one person',
    pillar: 'bonds',
    rule: 'at least 2 interactions',
    metric: 'interactions',
    threshold: 2,
    rationale: 'Contact is the only thing the bonds score actually rewards.',
  },
];

export const leverByKey = (key: string): Lever | undefined =>
  LEVERS.find((lever) => lever.key === key);

export interface SnapshotDay {
  date: string;
  total: number;
  mood: number | null;
  sleep_hours: number | null;
  steps: number | null;
  water_ml: number | null;
  exercise_min: number | null;
  savings_rate: number | null;
  interactions: number | null;
}

export interface ExperimentVerdict {
  days: number;
  met: number;
  missed: number;
  /** Average score on days the rule was met / missed. Null when unsampled. */
  scoreOn: number | null;
  scoreOff: number | null;
  scoreDelta: number | null;
  moodOn: number | null;
  moodOff: number | null;
  moodDelta: number | null;
  confidence: 'none' | 'weak' | 'fair';
  headline: string;
  detail: string;
}

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const round1 = (value: number) => Math.round(value * 10) / 10;

export const metricValue = (lever: Lever, day: SnapshotDay): number | null => {
  const raw = day[lever.metric];
  return raw === null || raw === undefined || Number.isNaN(Number(raw)) ? null : Number(raw);
};

export const dayMeetsLever = (lever: Lever, day: SnapshotDay): boolean | null => {
  const value = metricValue(lever, day);
  if (value === null) return null; // not logged, not "failed"
  return value >= lever.threshold;
};

/**
 * Needs at least two days on each side to say anything. Below that the honest
 * answer is "not enough yet", and saying so is part of the product.
 */
export function evaluateExperiment(lever: Lever, days: SnapshotDay[]): ExperimentVerdict {
  const on: SnapshotDay[] = [];
  const off: SnapshotDay[] = [];

  for (const day of days) {
    const meets = dayMeetsLever(lever, day);
    if (meets === true) on.push(day);
    else if (meets === false) off.push(day);
  }

  const scoreOn = mean(on.map((day) => day.total));
  const scoreOff = mean(off.map((day) => day.total));
  const moodOn = mean(on.map((day) => day.mood).filter((v): v is number => v !== null && v > 0));
  const moodOff = mean(off.map((day) => day.mood).filter((v): v is number => v !== null && v > 0));

  const scoreDelta = scoreOn !== null && scoreOff !== null ? round1(scoreOn - scoreOff) : null;
  const moodDelta = moodOn !== null && moodOff !== null ? round1(moodOn - moodOff) : null;

  const confidence: ExperimentVerdict['confidence'] =
    on.length >= 3 && off.length >= 2 ? 'fair' : on.length >= 2 && off.length >= 1 ? 'weak' : 'none';

  const headline =
    confidence === 'none'
      ? 'Not enough days yet'
      : scoreDelta !== null && scoreDelta > 0
        ? `${lever.label} lifts your score by ${scoreDelta}`
        : scoreDelta !== null && scoreDelta < 0
          ? `${lever.label} did not help this week`
          : `${lever.label} made no clear difference`;

  const detail =
    confidence === 'none'
      ? `You met the rule ${on.length} day${on.length === 1 ? '' : 's'} and missed it ${off.length}. Two on each side is the minimum to compare.`
      : `Score ${round1(scoreOn ?? 0)} on ${on.length} day${on.length === 1 ? '' : 's'} you met the rule, ${round1(scoreOff ?? 0)} on ${off.length} day${off.length === 1 ? '' : 's'} you did not.${
          moodDelta !== null ? ` Mood moved ${moodDelta > 0 ? '+' : ''}${moodDelta}.` : ''
        }`;

  return {
    days: on.length + off.length,
    met: on.length,
    missed: off.length,
    scoreOn: scoreOn === null ? null : round1(scoreOn),
    scoreOff: scoreOff === null ? null : round1(scoreOff),
    scoreDelta,
    moodOn: moodOn === null ? null : round1(moodOn),
    moodOff: moodOff === null ? null : round1(moodOff),
    moodDelta,
    confidence,
    headline,
    detail,
  };
}
