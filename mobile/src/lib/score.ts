/**
 * Trinity score engine — the single place a score is calculated.
 *
 * These are documented heuristics, not science. What matters is that the same
 * inputs always produce the same reading, that every point can be traced to an
 * input, and that a user can see which input is worth acting on today.
 *
 * Pillars are scored 0–100. Each pillar's inputs have fixed point ceilings that
 * sum to 100, so a pillar value is literally "points earned out of 100".
 */

export type PillarKey = 'health' | 'wealth' | 'bonds';

export interface Contribution {
  key: string;
  label: string;
  /** Points this input can earn at most. */
  max: number;
  /** Points earned today (0..max). */
  points: number;
  /** Points still on the table. */
  lost: number;
  /** Human-readable current value, e.g. "7,840 / 10,000". */
  display: string;
  /** 0..1, how close to the input's target. */
  ratio: number;
}

export interface PillarScore {
  key: PillarKey;
  label: string;
  /** 0..100 */
  value: number;
  /** Share of the total (0..1). Weights sum to 1 across pillars. */
  weight: number;
  contributions: Contribution[];
}

export interface ScoreInput {
  health: {
    steps: number;
    sleepHours: number;
    sleepQuality: number; // 1..5
    exerciseMinutes: number;
    waterMl: number;
    waterTarget: number;
    mood: number | null; // 1..5, null = not logged
    stress: number | null; // 0..10, null = not logged (0 is a real value)
  };
  wealth: {
    income: number;
    expenses: number;
    savingsRate: number; // 0..100
  };
  bonds: {
    interactions7d: number;
    people: number;
    avgMood: number; // 1..5
  };
}

/** Pillar weights: health is the most controllable, wealth the least frequent. */
export const PILLAR_WEIGHTS: Record<PillarKey, number> = {
  health: 0.4,
  wealth: 0.3,
  bonds: 0.3,
};

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const round = (n: number) => Math.round(n);

const contribution = (
  key: string,
  label: string,
  max: number,
  ratio: number,
  display: string,
): Contribution => {
  const safe = clamp01(ratio);
  const points = round(safe * max);
  return { key, label, max, points, lost: max - points, display, ratio: safe };
};

/** A day's movement target; below it the step input scales linearly. */
const STEPS_TARGET = 10_000;
const SLEEP_TARGET = 8;
const EXERCISE_TARGET = 45;
const WATER_TARGET_FALLBACK = 2_500;
const INTERACTIONS_TARGET = 5;

export function scoreHealth(input: ScoreInput['health']): Contribution[] {
  const waterTarget = input.waterTarget > 0 ? input.waterTarget : WATER_TARGET_FALLBACK;

  // Mental contributes only when logged, so a missing entry is not a penalty.
  // Zero stress is the best possible value, so "not logged" is null, not 0.
  const mentalParts = [
    input.mood !== null ? input.mood / 5 : null,
    input.stress !== null ? 1 - input.stress / 10 : null,
  ].filter((part): part is number => part !== null);
  const mentalLogged = mentalParts.length > 0;
  const mentalRatio = mentalLogged
    ? mentalParts.reduce((sum, part) => sum + part, 0) / mentalParts.length
    : 0;

  return [
    contribution('steps', 'Steps', 30, input.steps / STEPS_TARGET, `${Math.round(input.steps).toLocaleString()} / 10,000`),
    contribution(
      'sleep',
      'Sleep',
      30,
      (Math.min(input.sleepHours / SLEEP_TARGET, 1) + Math.min(Math.max(input.sleepQuality, 0) / 5, 1)) / 2,
      `${input.sleepHours.toFixed(1)} h · ${Math.round(input.sleepQuality)}/5`,
    ),
    contribution(
      'exercise',
      'Exercise',
      20,
      input.exerciseMinutes / EXERCISE_TARGET,
      `${Math.round(input.exerciseMinutes)} / 45 min`,
    ),
    contribution('water', 'Water', 10, input.waterMl / waterTarget, `${Math.round(input.waterMl)} / ${Math.round(waterTarget)} ml`),
    contribution(
      'mental',
      'Mood & stress',
      10,
      mentalLogged ? mentalRatio : 0,
      mentalLogged
        ? [input.mood !== null ? `${input.mood}/5` : null, input.stress !== null ? `stress ${input.stress.toFixed(1)}` : null]
            .filter(Boolean)
            .join(' · ')
        : 'not logged',
    ),
  ];
}

export function scoreWealth(input: ScoreInput['wealth']): Contribution[] {
  // Saving is the strongest signal; keeping spend under income is the second.
  const spendRatio = input.income > 0 ? clamp01(input.expenses / input.income) : 0;
  return [
    contribution(
      'savings',
      'Savings rate',
      60,
      input.income > 0 ? input.savingsRate / 100 : 0,
      input.income > 0 ? `${Math.round(input.savingsRate)}%` : 'not tracked',
    ),
    contribution(
      'spend',
      'Spending vs income',
      40,
      // no income logged means nothing is known about spending — no free points
      input.income > 0 ? 1 - spendRatio : 0,
      input.income > 0 ? `${Math.round(spendRatio * 100)}% of income` : 'no income logged',
    ),
  ];
}

export function scoreBonds(input: ScoreInput['bonds']): Contribution[] {
  return [
    contribution('contact', 'People reached', 60, input.interactions7d / INTERACTIONS_TARGET, `${Math.round(input.interactions7d)} in 7 days`),
    contribution('mood', 'How they felt', 40, input.avgMood / 5, `${input.avgMood.toFixed(1)}/5`),
  ];
}

const PILLARS: Array<{ key: PillarKey; label: string; score: (input: ScoreInput) => Contribution[] }> = [
  { key: 'health', label: 'HEALTH', score: (input) => scoreHealth(input.health) },
  { key: 'wealth', label: 'WEALTH', score: (input) => scoreWealth(input.wealth) },
  { key: 'bonds', label: 'BONDS', score: (input) => scoreBonds(input.bonds) },
];

export interface ScoreReport {
  total: number;
  pillars: PillarScore[];
  weakest: PillarKey;
  strongest: PillarKey;
  /** The input with the most points available, weighted by its pillar. */
  topAction: { pillar: PillarKey; key: string; label: string; points: number; display: string } | null;
}

export function computeScore(input: ScoreInput): ScoreReport {
  const pillars: PillarScore[] = PILLARS.map(({ key, label, score }) => {
    const contributions = score(input);
    const earned = contributions.reduce((sum, item) => sum + item.points, 0);
    return {
      key,
      label,
      value: Math.min(100, Math.max(0, round(earned))),
      weight: PILLAR_WEIGHTS[key],
      contributions,
    };
  });

  const total = Math.round(pillars.reduce((sum, pillar) => sum + pillar.value * pillar.weight, 0));

  const sorted = [...pillars].sort((a, b) => a.value - b.value);
  const weakest = sorted[0].key;
  const strongest = sorted[sorted.length - 1].key;

  const candidates = pillars.flatMap((pillar) =>
    pillar.contributions.map((item) => ({
      pillar: pillar.key,
      key: item.key,
      label: item.label,
      display: item.display,
      // weight the opportunity by how much the pillar counts in the total
      points: item.lost * pillar.weight,
      rawLost: item.lost,
    })),
  );
  const best = candidates.sort((a, b) => b.points - a.points)[0];

  return {
    total,
    pillars,
    weakest,
    strongest,
    topAction:
      best && best.rawLost > 0
        ? { pillar: best.pillar, key: best.key, label: best.label, points: Math.round(best.rawLost), display: best.display }
        : null,
  };
}

/* ---------------------------------------------------------------------------
   Stress
   The mirror of the life score: how much load the same inputs are putting on
   you. Sleep debt and logged stress dominate, money and isolation add to it.
   ------------------------------------------------------------------------- */

export interface StressDriver {
  key: string;
  label: string;
  points: number;
}

export interface StressReport {
  /** 0–100. Higher means more load. */
  score: number;
  level: 'Low' | 'Medium' | 'High';
  drivers: StressDriver[];
}

export function computeStress(input: ScoreInput): StressReport {
  const sleepDebt = Math.max(0, 7.5 - input.health.sleepHours) * 8;
  const mental = input.health.stress !== null ? input.health.stress * 6 : 0;
  const money = Math.max(0, 40 - input.wealth.savingsRate) * 0.8;
  const isolation = Math.max(0, 3 - input.bonds.interactions7d) * 8;

  const drivers: StressDriver[] = [
    { key: 'sleep', label: 'Short sleep', points: sleepDebt },
    {
      key: 'mental',
      label: input.health.stress !== null ? 'Logged stress' : 'No stress logged',
      points: mental,
    },
    { key: 'money', label: 'Financial strain', points: money },
    { key: 'bonds', label: 'Little contact', points: isolation },
  ]
    .filter((driver) => driver.points > 0)
    .sort((a, b) => b.points - a.points);

  const score = Math.round(Math.min(100, sleepDebt + mental + money + isolation));

  return {
    score,
    level: score >= 66 ? 'High' : score >= 33 ? 'Medium' : 'Low',
    drivers: drivers.slice(0, 3).map((driver) => ({ ...driver, points: Math.round(driver.points) })),
  };
}
