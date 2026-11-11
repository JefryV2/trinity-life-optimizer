import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  evaluateExperiment,
  leverByKey,
  LEVERS,
  type ExperimentVerdict,
  type Lever,
  type SnapshotDay,
} from '@/lib/experiment';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const tables = supabase;

export interface ExperimentRow {
  id: string;
  lever: string;
  target_label: string;
  started_on: string;
  ends_on: string;
  status: 'running' | 'done' | 'abandoned';
}

const iso = (date: Date) => date.toISOString().slice(0, 10);
export const addDays = (day: string, days: number) =>
  iso(new Date(new Date(`${day}T00:00:00`).getTime() + days * 86_400_000));

export const WINDOW_DAYS = 7;

export const useExperiments = () => {
  const { user } = useAuth();
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ['experiments', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const today = iso(new Date());
      const [experimentResult, snapshotResult] = await Promise.all([
        tables
          .from('experiments')
          .select('id, lever, target_label, started_on, ends_on, status')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1),
        tables
          .from('score_snapshots')
          .select('date, total, mood, sleep_hours, steps, water_ml, exercise_min, savings_rate, interactions')
          .eq('user_id', user!.id)
          .gte('date', addDays(today, -20))
          .order('date', { ascending: false }),
      ]);

      return {
        experiment: ((experimentResult.data ?? [])[0] ?? null) as ExperimentRow | null,
        days: (snapshotResult.data ?? []) as SnapshotDay[],
      };
    },
  });

  const start = useMutation({
    mutationFn: async (lever: Lever) => {
      const startedOn = iso(new Date());
      const { error } = await tables.from('experiments').insert({
        user_id: user!.id,
        lever: lever.key,
        target_label: lever.rule,
        started_on: startedOn,
        ends_on: addDays(startedOn, WINDOW_DAYS - 1),
        status: 'running',
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['experiments', user?.id] }),
  });

  const finish = useMutation({
    mutationFn: async (input: { id: string; status: 'done' | 'abandoned' }) => {
      const { error } = await tables
        .from('experiments')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['experiments', user?.id] }),
  });

  const experiment = query.data?.experiment ?? null;
  const lever = experiment ? leverByKey(experiment.lever) : undefined;
  const days = (query.data?.days ?? []).filter(
    (day) => !experiment || (day.date >= experiment.started_on && day.date <= experiment.ends_on),
  );
  const verdict: ExperimentVerdict | null = lever ? evaluateExperiment(lever, days) : null;

  const dayIndex = experiment
    ? Math.min(
        WINDOW_DAYS,
        Math.max(
          1,
          Math.round(
            (new Date(iso(new Date())).getTime() - new Date(experiment.started_on).getTime()) / 86_400_000,
          ) + 1,
        ),
      )
    : 0;

  return {
    experiment,
    lever,
    days,
    verdict,
    dayIndex,
    levers: LEVERS,
    loading: query.isPending,
    starting: start.isPending,
    finishing: finish.isPending,
    error: query.error as Error | null,
    start: (item: Lever) => start.mutate(item),
    finish: (status: 'done' | 'abandoned') =>
      experiment ? finish.mutate({ id: experiment.id, status }) : undefined,
    refresh: query.refetch,
  };
};
