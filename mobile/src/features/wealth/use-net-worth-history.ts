import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface NetWorthPoint {
  date: string;
  netWorth: number;
}

/** Last 30 days of net-worth snapshots. Empty until a few days are recorded. */
export const useNetWorthHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['net-worth-history', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<NetWorthPoint[]> => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('score_snapshots')
        .select('date, net_worth')
        .eq('user_id', user!.id)
        .gte('date', since)
        .order('date', { ascending: true });
      if (error) return [];
      return (data ?? []).map((row) => ({
        date: String(row.date),
        netWorth: Number(row.net_worth ?? 0),
      }));
    },
  });
};
