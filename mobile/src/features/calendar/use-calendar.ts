import { useQuery } from '@tanstack/react-query';

import { endOfMonth, isoDate, startOfMonth } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface CalendarDay {
  date: string;
  health: number | null;
  wealth: number | null;
  relations: number | null;
  goals: number | null;
  completedGoals: number;
  totalGoals: number;
}

const TABLES = [
  ['health_daily_scores', 'health'],
  ['wealth_daily_scores', 'wealth'],
  ['relations_daily_scores', 'relations'],
  ['health_goals_progress', 'healthGoals'],
  ['wealth_goals_progress', 'wealthGoals'],
  ['relations_goals_progress', 'relationsGoals'],
] as const;

const emptyDay = (date: string): CalendarDay => ({
  date,
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

      const results = await Promise.all(
        TABLES.map(async ([table, key]) => {
          const select = key.endsWith('Goals')
            ? 'date,score,completed_count,total_count'
            : 'date,score';
          const result = await supabase
            .from(table)
            .select(select)
            .eq('user_id', userId)
            .gte('date', start)
            .lte('date', end);
          return { key, result };
        }),
      );

      for (const { key, result } of results) {
        if (result.error) {
          if (result.error.code === 'PGRST205') continue;
          throw new Error(result.error.message);
        }
        for (const row of result.data ?? []) {
          const typed = row as unknown as { date: string; score: number | null; completed_count?: number; total_count?: number };
          const bucket = buckets.get(typed.date);
          if (!bucket) continue;
          if (key === 'health' || key === 'wealth' || key === 'relations') {
            bucket[key] = typed.score;
          } else {
            bucket.completedGoals += Number(typed.completed_count ?? 0);
            bucket.totalGoals += Number(typed.total_count ?? 0);
          }
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