import { useQuery } from '@tanstack/react-query';

import { addDays, clamp, isoDate } from '@/lib/format';
import { average, correlation } from '@/lib/scoring';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface InsightDay {
  date: string;
  health: number | null;
  wealth: number | null;
  relations: number | null;
  sleep: number | null;
  steps: number | null;
  mood: number | null;
}

export interface Correlation {
  label: string;
  value: number;
  note: string;
}

export interface InsightsData {
  days: InsightDay[];
  correlations: Correlation[];
  healthAvg: number;
  wealthAvg: number;
  relationsAvg: number;
  sleepAvg: number;
  stepsAvg: number;
  moodAvg: number;
}

const dayKey = (value: string) => isoDate(new Date(value));

export const useInsights = (days: 7 | 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['insights', user?.id, days],
    enabled: Boolean(user),
    queryFn: async (): Promise<InsightsData> => {
      const userId = user!.id;
      const start = addDays(new Date(), -(days - 1));
      start.setHours(0, 0, 0, 0);
      const startISO = start.toISOString();

      const [health, wealth, relations, sleep, steps, mental, interactions] =
        await Promise.all([
          supabase
            .from('health_daily_scores')
            .select('date,score')
            .eq('user_id', userId)
            .gte('date', isoDate(start)),
          supabase
            .from('wealth_daily_scores')
            .select('date,score')
            .eq('user_id', userId)
            .gte('date', isoDate(start)),
          supabase
            .from('relations_daily_scores')
            .select('date,score')
            .eq('user_id', userId)
            .gte('date', isoDate(start)),
          supabase
            .from('sleep_records')
            .select('sleep_duration_hours,sleep_quality,created_at')
            .eq('user_id', userId)
            .gte('created_at', startISO),
          supabase
            .from('step_records')
            .select('date,steps')
            .eq('user_id', userId)
            .gte('date', isoDate(start)),
          supabase
            .from('mental_health_logs')
            .select('mood_rating,stress_level,logged_at')
            .eq('user_id', userId)
            .gte('logged_at', startISO),
          supabase
            .from('interactions')
            .select('mood_rating,occurred_at')
            .eq('user_id', userId)
            .gte('occurred_at', startISO),
        ]);

      const failure = [health, wealth, relations, sleep, steps, mental, interactions].find(
        (result) => result.error,
      );
      if (failure?.error) throw new Error(failure.error.message);

      const buckets = new Map<string, InsightDay>();
      for (let index = 0; index < days; index += 1) {
        const date = isoDate(addDays(start, index));
        buckets.set(date, {
          date,
          health: null,
          wealth: null,
          relations: null,
          sleep: null,
          steps: null,
          mood: null,
        });
      }

      const setScore = (
        rows: Array<{ date: string; score: number | null }> | null,
        key: 'health' | 'wealth' | 'relations',
      ) => {
        (rows ?? []).forEach((row) => {
          const bucket = buckets.get(row.date);
          if (bucket) bucket[key] = row.score;
        });
      };

      setScore(health.data, 'health');
      setScore(wealth.data, 'wealth');
      setScore(relations.data, 'relations');

      const sleepByDay = new Map<string, number[]>();
      (sleep.data ?? []).forEach((row) => {
        const key = dayKey(row.created_at);
        sleepByDay.set(key, [...(sleepByDay.get(key) ?? []), row.sleep_duration_hours ?? 0]);
      });

      const moodByDay = new Map<string, number[]>();
      (mental.data ?? []).forEach((row) => {
        const key = dayKey(row.logged_at ?? '');
        moodByDay.set(key, [...(moodByDay.get(key) ?? []), row.mood_rating ?? 0]);
      });

      const interactionMoodByDay = new Map<string, number[]>();
      (interactions.data ?? []).forEach((row) => {
        const key = dayKey(row.occurred_at);
        interactionMoodByDay.set(key, [
          ...(interactionMoodByDay.get(key) ?? []),
          row.mood_rating ?? 0,
        ]);
      });

      (steps.data ?? []).forEach((row) => {
        const bucket = buckets.get(row.date);
        if (bucket) bucket.steps = row.steps;
      });

      buckets.forEach((bucket, key) => {
        const sleepValues = sleepByDay.get(key);
        if (sleepValues?.length) bucket.sleep = average(sleepValues);

        const moodValues = moodByDay.get(key);
        if (moodValues?.length) bucket.mood = average(moodValues);

        // Fill a missing stored score from the same day's raw records, so a
        // blank chart means "no records", not "the score job did not run".
        if (bucket.health === null && (sleepValues?.length || moodValues?.length)) {
          const sleepHours = bucket.sleep ?? 0;
          const mood = bucket.mood ?? 0;
          bucket.health = Math.round(clamp(mood * 10 + (sleepHours >= 7 ? 25 : sleepHours * 3)));
        }

        if (bucket.relations === null) {
          const values = interactionMoodByDay.get(key);
          if (values?.length) bucket.relations = Math.round(clamp(average(values) * 10));
        }
      });

      const ordered = [...buckets.values()];
      const withHealth = ordered.filter((day) => day.health !== null);
      const withWealth = ordered.filter((day) => day.wealth !== null);
      const withRelations = ordered.filter((day) => day.relations !== null);

      const correlations: Correlation[] = [];
      const addCorrelation = (
        label: string,
        xs: Array<number | null>,
        ys: Array<number | null>,
        positive: string,
        negative: string,
      ) => {
        const pairs = xs
          .map((x, index) => [x, ys[index]] as const)
          .filter((pair): pair is readonly [number, number] => pair[0] !== null && pair[1] !== null);
        const value = correlation(
          pairs.map((pair) => pair[0]),
          pairs.map((pair) => pair[1]),
        );
        if (value === null || Math.abs(value) < 0.2) return;
        correlations.push({
          label,
          value,
          note: value > 0 ? positive : negative,
        });
      };

      addCorrelation(
        'Sleep vs health score',
        ordered.map((day) => day.sleep),
        ordered.map((day) => day.health),
        'Longer sleep tends to lift your health score.',
        'More sleep has coincided with lower health scores so far.',
      );
      addCorrelation(
        'Steps vs health score',
        ordered.map((day) => day.steps),
        ordered.map((day) => day.health),
        'Higher-step days tend to score better.',
        'Higher-step days have scored lower so far.',
      );
      addCorrelation(
        'Sleep vs mood',
        ordered.map((day) => day.sleep),
        ordered.map((day) => day.mood),
        'More sleep tends to lift your mood.',
        'More sleep has tracked with lower mood so far.',
      );
      addCorrelation(
        'Steps vs mood',
        ordered.map((day) => day.steps),
        ordered.map((day) => day.mood),
        'Higher-step days tend to feel better.',
        'Higher-step days have felt lower so far.',
      );
      addCorrelation(
        'Health vs mood',
        ordered.map((day) => day.health),
        ordered.map((day) => day.mood),
        'Health and mood move together.',
        'Health and mood have moved apart.',
      );
      addCorrelation(
        'Wealth vs mood',
        ordered.map((day) => day.wealth),
        ordered.map((day) => day.mood),
        'Wealth and mood move together.',
        'Wealth and mood have moved apart.',
      );
      addCorrelation(
        'Bonds vs mood',
        ordered.map((day) => day.relations),
        ordered.map((day) => day.mood),
        'Contact and mood move together.',
        'Contact and mood have moved apart.',
      );

      addCorrelation(
        'Mood vs relations score',
        ordered.map((day) => day.mood),
        ordered.map((day) => day.relations),
        'Better moods follow stronger contact days.',
        'Contact days and mood have moved in opposite directions.',
      );

      const averageOf = (values: Array<number | null>) => {
        const present = values.filter((value): value is number => value !== null);
        return present.length ? Math.round(average(present)) : 0;
      };

      return {
        days: ordered,
        correlations,
        healthAvg: averageOf(withHealth.map((day) => day.health)),
        wealthAvg: averageOf(withWealth.map((day) => day.wealth)),
        relationsAvg: averageOf(withRelations.map((day) => day.relations)),
        sleepAvg: Number(
          average(
            ordered
              .map((day) => day.sleep)
              .filter((value): value is number => value !== null),
          ).toFixed(1),
        ),
        stepsAvg: averageOf(ordered.map((day) => day.steps)),
        moodAvg: Number(
          average(
            ordered
              .map((day) => day.mood)
              .filter((value): value is number => value !== null),
          ).toFixed(1),
        ),
      };
    },
  });
};
