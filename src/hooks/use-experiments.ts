import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { newTables } from '@/lib/db';
import {
  evaluateExperiment,
  leverByKey,
  LEVERS,
  type ExperimentVerdict,
  type Lever,
  type LeverKey,
  type SnapshotDay,
} from '@/lib/experiment';

export interface ExperimentRow {
  id: string;
  lever: string;
  target_label: string;
  started_on: string;
  ends_on: string;
  status: 'running' | 'done' | 'abandoned';
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) =>
  new Date(new Date(`${iso}T00:00:00`).getTime() + days * 864e5).toISOString().slice(0, 10);

export function useExperiments() {
  const { user } = useAuth();
  const [experiment, setExperiment] = useState<ExperimentRow | null>(null);
  const [days, setDays] = useState<SnapshotDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const since = addDays(today(), -20);

    const [{ data: rows }, { data: snapshots }] = await Promise.all([
      newTables
        .from('experiments')
        .select('id, lever, target_label, started_on, ends_on, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1),
      newTables
        .from('score_snapshots')
        .select('date, total, mood, sleep_hours, steps, water_ml, exercise_min, savings_rate, interactions')
        .eq('user_id', user.id)
        .gte('date', since)
        .order('date', { ascending: false }),
    ]);

    setExperiment((rows?.[0] as ExperimentRow) ?? null);
    setDays(((snapshots ?? []) as SnapshotDay[]).slice());
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = useCallback(
    async (lever: Lever) => {
      if (!user?.id) return;
      setBusy(true);
      const startedOn = today();
      await newTables.from('experiments').insert({
        user_id: user.id,
        lever: lever.key,
        target_label: lever.rule,
        started_on: startedOn,
        ends_on: addDays(startedOn, 6),
        status: 'running',
      });
      await load();
      setBusy(false);
    },
    [load, user?.id],
  );

  const finish = useCallback(
    async (status: 'done' | 'abandoned') => {
      if (!experiment) return;
      setBusy(true);
      await newTables
        .from('experiments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', experiment.id);
      await load();
      setBusy(false);
    },
    [experiment, load],
  );

  const lever = experiment ? leverByKey(experiment.lever) : undefined;
  const windowDays = experiment
    ? days.filter((day) => day.date >= experiment.started_on && day.date <= experiment.ends_on)
    : [];
  const verdict: ExperimentVerdict | null = lever ? evaluateExperiment(lever, windowDays) : null;
  const dayIndex = experiment
    ? Math.min(
        7,
        Math.max(1, Math.round((new Date(today()).getTime() - new Date(experiment.started_on).getTime()) / 864e5) + 1),
      )
    : 0;

  return {
    experiment,
    lever,
    days: windowDays,
    verdict,
    loading,
    busy,
    dayIndex,
    start,
    finish,
    reload: load,
    levers: LEVERS,
    isRunning: experiment?.status === 'running',
  };
}

export type { Lever, LeverKey };
