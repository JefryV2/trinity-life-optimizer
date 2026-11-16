import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { newTables } from '@/lib/db';
import { computeScore, type ScoreInput, type ScoreReport } from '@/lib/score';
import { useAuth } from '@/components/AuthProvider';

const EMPTY_INPUT: ScoreInput = {
  health: {
    steps: 0,
    sleepHours: 0,
    sleepQuality: 0,
    exerciseMinutes: 0,
    waterMl: 0,
    waterTarget: 2500,
    mood: null,
    stress: null,
  },
  wealth: { income: 0, expenses: 0, savingsRate: 0 },
  bonds: { interactions7d: 0, people: 0, avgMood: 0 },
};

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Reads the raw inputs once and hands them to the score engine. Nothing here
 * decides what a score means — that lives in `lib/score.ts` so the explanation
 * and the number can never disagree.
 */
export function useScore() {
  const { user } = useAuth();
  const [input, setInput] = useState<ScoreInput>(EMPTY_INPUT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [sleep, steps, exercise, water, mental, transactions, interactions, people] =
      await Promise.all([
        supabase
          .from('sleep_records')
          .select('sleep_duration_hours, sleep_quality')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(7),
        supabase
          .from('step_records')
          .select('steps')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('exercise_records')
          .select('duration_minutes')
          .eq('user_id', user.id)
          .gte('completed_at', weekAgo),
        supabase
          .from('hydration_records')
          .select('water_intake_ml, target_ml')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('mental_health_logs')
          .select('mood_rating, stress_level')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(7),
        supabase
          .from('transactions')
          .select('amount, direction')
          .eq('user_id', user.id)
          .gte('occurred_at', monthStart),
        supabase
          .from('interactions')
          .select('mood_rating')
          .eq('user_id', user.id)
          .gte('occurred_at', weekAgo),
        supabase.from('relationships').select('id').eq('user_id', user.id),
      ]);

    const sleepRows = sleep.data ?? [];
    const mentalRows = mental.data ?? [];
    const monthly = transactions.data ?? [];
    const interactionRows = interactions.data ?? [];

    const income = monthly
      .filter((row) => row.direction === 'in')
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const expenses = monthly
      .filter((row) => row.direction === 'out')
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const savingsRate = income > 0 ? Math.max(0, Math.min(100, ((income - expenses) / income) * 100)) : 0;

    const moodValues = mentalRows.map((row) => row.mood_rating).filter((v): v is number => v !== null);
    const stressValues = mentalRows.map((row) => row.stress_level).filter((v): v is number => v !== null);
    const interactionMoods = interactionRows
      .map((row) => row.mood_rating)
      .filter((v): v is number => v !== null);

    const stepRow = (steps.data ?? null) as { steps?: number } | null;
    const waterRow = (water.data ?? null) as
      | { water_intake_ml?: number; target_ml?: number }
      | null;

    setInput({
      health: {
        steps: stepRow?.steps ?? 0,
        sleepHours: average(sleepRows.map((row) => row.sleep_duration_hours ?? 0)),
        sleepQuality: average(sleepRows.map((row) => row.sleep_quality ?? 0)),
        exerciseMinutes: (exercise.data ?? []).reduce(
          (sum, row) => sum + (row.duration_minutes ?? 0),
          0,
        ),
        waterMl: waterRow?.water_intake_ml ?? 0,
        waterTarget: waterRow?.target_ml ?? 2500,
        mood: moodValues.length > 0 ? average(moodValues) : null,
        stress: stressValues.length > 0 ? average(stressValues) : null,
      },
      wealth: { income, expenses, savingsRate },
      bonds: {
        interactions7d: interactionRows.length,
        people: (people.data ?? []).length,
        avgMood: average(interactionMoods),
      },
    });
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const report: ScoreReport = computeScore(input);

  // Every visit upserts today's row, so experiments always have days to judge.
  useEffect(() => {
    if (!user?.id || loading) return;
    const pillar = (key: 'health' | 'wealth' | 'bonds') =>
      report.pillars.find((item) => item.key === key)?.value ?? 0;

    void newTables.from('score_snapshots').upsert(
      {
        user_id: user.id,
        date: new Date().toISOString().slice(0, 10),
        total: report.total,
        health: pillar('health'),
        wealth: pillar('wealth'),
        bonds: pillar('bonds'),
        sleep_hours: input.health.sleepHours,
        steps: Math.round(input.health.steps),
        water_ml: Math.round(input.health.waterMl),
        exercise_min: Math.round(input.health.exerciseMinutes),
        savings_rate: Math.round(input.wealth.savingsRate),
        interactions: input.bonds.interactions7d,
        mood: input.health.mood,
      },
      { onConflict: 'user_id,date' },
    );
  }, [input, loading, report, user?.id]);

  return { report, input, loading, reload: load };
}
