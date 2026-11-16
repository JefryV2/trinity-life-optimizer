import type { ScoreReport } from '@/lib/score';
import { supabase } from '@/lib/supabase';

/**
 * One row per user per day. Experiments are judged from these rows, so the app
 * writes today's snapshot whenever the dashboard loads. Idempotent by
 * (user_id, date).
 */
let lastSnapshotKey = '';

export const saveDailySnapshot = async (
  userId: string,
  report: ScoreReport,
  inputs: {
    sleepHours: number;
    steps: number;
    waterMl: number;
    exerciseMinutes: number;
    savingsRate: number;
    interactions: number;
    mood: number | null;
    netWorth: number;
  },
) => {
  const pillar = (key: 'health' | 'wealth' | 'bonds') =>
    report.pillars.find((item) => item.key === key)?.value ?? 0;

  const date = new Date().toISOString().slice(0, 10);
  const key = JSON.stringify([
    userId,
    date,
    report.total,
    report.pillars.map((pillarItem) => pillarItem.value),
    inputs.sleepHours,
    inputs.steps,
    inputs.waterMl,
    inputs.exerciseMinutes,
    inputs.savingsRate,
    inputs.interactions,
    inputs.mood,
    inputs.netWorth,
  ]);
  if (key === lastSnapshotKey) return;
  lastSnapshotKey = key;

  const { error } = await supabase.from('score_snapshots').upsert(
    {
      user_id: userId,
      date,
      total: report.total,
      health: pillar('health'),
      wealth: pillar('wealth'),
      bonds: pillar('bonds'),
      sleep_hours: inputs.sleepHours,
      steps: Math.round(inputs.steps),
      water_ml: Math.round(inputs.waterMl),
      exercise_min: Math.round(inputs.exerciseMinutes),
      savings_rate: Math.round(inputs.savingsRate),
      interactions: inputs.interactions,
      mood: inputs.mood,
      net_worth: Math.round(inputs.netWorth),
    },
    { onConflict: 'user_id,date' },
  );

  // A failed snapshot must never break the dashboard.
  if (error) {
    lastSnapshotKey = '';
    console.warn('[snapshot]', error.message);
  }
};
