import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface HeartReading {
  id: string;
  heart_rate: number;
  timestamp: string;
  source_device: string | null;
  activity_type: string | null;
  confidence: number | null;
}

export interface HeartStats {
  latest: number | null;
  average: number;
  resting: number | null;
  max: number;
  min: number;
  count: number;
}

export const useHeart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['heart', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<{ readings: HeartReading[]; stats: HeartStats }> => {
      const { data, error } = await supabase
        .from('heart_rate_data')
        .select('id,heart_rate,timestamp,source_device,activity_type,confidence')
        .eq('user_id', userId!)
        .gte('timestamp', new Date(Date.now() - 7 * 86_400_000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);

      const readings = (data ?? []) as HeartReading[];
      const values = readings.map((reading) => reading.heart_rate);
      const restingValues = readings
        .filter((reading) => reading.activity_type === 'resting')
        .map((reading) => reading.heart_rate);

      return {
        readings,
        stats: {
          latest: values[0] ?? null,
          average: values.length
            ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
            : 0,
          resting: restingValues.length
            ? Math.round(
                restingValues.reduce((sum, value) => sum + value, 0) / restingValues.length,
              )
            : null,
          max: values.length ? Math.max(...values) : 0,
          min: values.length ? Math.min(...values) : 0,
          count: values.length,
        },
      };
    },
  });

  const addManual = useMutation({
    mutationFn: async (input: { bpm: number; activity: string }) => {
      const { error } = await supabase.from('heart_rate_data').insert({
        user_id: userId!,
        heart_rate: input.bpm,
        timestamp: new Date().toISOString(),
        source_device: 'manual',
        activity_type: input.activity,
        confidence: 1,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['heart'] }),
  });

  return { ...query, addManual };
};