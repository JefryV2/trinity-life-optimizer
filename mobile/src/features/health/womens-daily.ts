import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

/**
 * womens_health_daily_logs exists in the database (migration
 * 20260112170000) but not in the generated types yet. All access is
 * isolated here with a local row type, mirroring the web app.
 */
export interface WomensDailyLog {
  id: string;
  date: string;
  flow_intensity: string | null;
  moods: string[] | null;
  symptoms: string[] | null;
  pain_level: number | null;
  notes: string | null;
}

export interface WomensDailyInput {
  date: string;
  flow: string | null;
  moods: string[];
  symptoms: string[];
  pain: number;
  notes: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => supabase.from('womens_health_daily_logs' as any);

export const useWomensDaily = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['womens-daily', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<{ logs: WomensDailyLog[]; available: boolean }> => {
      const { data, error } = await table()
        .select('id,date,flow_intensity,moods,symptoms,pain_level,notes')
        .eq('user_id', userId!)
        .order('date', { ascending: false })
        .limit(30);
      if (error) {
        if (error.code === 'PGRST205') return { logs: [], available: false };
        throw new Error(error.message);
      }
      return { logs: (data ?? []) as unknown as WomensDailyLog[], available: true };
    },
  });

  const saveLog = useMutation({
    mutationFn: async (input: WomensDailyInput) => {
      const { error } = await table().upsert(
        {
          user_id: userId!,
          date: input.date,
          flow_intensity: input.flow,
          moods: input.moods.length > 0 ? input.moods : null,
          symptoms: input.symptoms.length > 0 ? input.symptoms : null,
          pain_level: input.pain,
          notes: input.notes.trim() || null,
        },
        { onConflict: 'user_id,date' },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['womens-daily'] }),
  });

  const todayLog = query.data?.logs.find((log) => log.date === isoDate()) ?? null;

  return { ...query, saveLog, todayLog };
};