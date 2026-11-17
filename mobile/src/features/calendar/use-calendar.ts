import { useQuery } from '@tanstack/react-query';

import { endOfMonth, isoDate, startOfMonth } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface CalendarDay {
  date: string;
  total: number | null;
  health: number | null;
  wealth: number | null;
  relations: number | null;
  goals: number | null;
  completedGoals: number;
  totalGoals: number;
}

const GOAL_TABLES = [
  ['health_goals_progress', 'healthGoals'],
  ['wealth_goals_progress', 'wealthGoals'],
  ['relations_goals_progress', 'relationsGoals'],
] as const;

const emptyDay = (date: string): CalendarDay => ({
  date,
  total: null,
  health: null,
  wealth: null,
  relations: null,
  goals: null,
  completedGoals: 0,
  totalGoals: 0,
});

export const useCalendar = (month: Date) => {
  const { user } = useAuth();
  const start = isoDate(startOfMonth(month));
  const end = isoDate(endOfMonth(month));

  return useQuery({
    queryKey: ['calendar', user?.id, start],
    enabled: Boolean(user),
    queryFn: async (): Promise<CalendarDay[]> => {
      const userId = user!.id;
      const buckets = new Map<string, CalendarDay>();
      const cursor = startOfMonth(month);
      while (cursor <= endOfMonth(month)) {
        buckets.set(isoDate(cursor), emptyDay(isoDate(cursor)));
        cursor.setDate(cursor.getDate() + 1);
      }

      // One canonical reading per day: the same snapshots the weekly review
      // and experiments use, so today cannot say 64 here and 69 on Today.
      const [scores, ...goalResults] = await Promise.all([
        supabase
          .from('score_snapshots')
          .select('date,total,health,wealth,bonds')
          .eq('user_id', userId)
          .gte('date', start)
          .lte('date', end),
        ...GOAL_TABLES.map(async ([table, key]) => {
          const result = await supabase
            .from(table)
            .select('date,score,completed_count,total_count')
            .eq('user_id', userId)
            .gte('date', start)
            .lte('date', end);
          return { key, result };
        }),
      ]);

      if (scores.error) throw new Error(scores.error.message);
      for (const row of scores.data ?? []) {
        const typed = row as unknown as {
          date: string;
          total: number | null;
          health: number | null;
          wealth: number | null;
          bonds: number | null;
        };
        const bucket = buckets.get(typed.date);
        if (!bucket) continue;
        bucket.total = typed.total;
        bucket.health = typed.health;
        bucket.wealth = typed.wealth;
        bucket.relations = typed.bonds;
      }

      for (const { key, result } of goalResults) {
        if (result.error) {
          if (result.error.code === 'PGRST205') continue;
          throw new Error(result.error.message);
        }
        for (const row of result.data ?? []) {
          const typed = row as unknown as {
            date: string;
            completed_count?: number;
            total_count?: number;
          };
          const bucket = buckets.get(typed.date);
          if (!bucket) continue;
          bucket.completedGoals += Number(typed.completed_count ?? 0);
          bucket.totalGoals += Number(typed.total_count ?? 0);
        }
      }

      for (const bucket of buckets.values()) {
        if (bucket.totalGoals > 0) {
          bucket.goals = Math.round((bucket.completedGoals / bucket.totalGoals) * 100);
        }
      }

      return [...buckets.values()];
    },
  });
};