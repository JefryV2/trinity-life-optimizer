import { useQuery } from '@tanstack/react-query';

import type { Micronutrients } from '@/lib/nutrition';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface RecentFood {
  food_name: string;
  meal_type: string | null;
  total_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  components: unknown;
  micronutrients: Micronutrients | null;
  consumed_at: string | null;
}

export const useRecentFoods = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-foods', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<RecentFood[]> => {
      const { data, error } = await supabase
        .from('food_entries')
        .select('food_name,meal_type,total_calories,protein_g,carbs_g,fat_g,fiber_g,sugar_g,sodium_mg,components,micronutrients,consumed_at')
        .eq('user_id', user!.id)
        .order('consumed_at', { ascending: false })
        .limit(12);
      if (error) throw new Error(error.message);
      return (data ?? []) as RecentFood[];
    },
  });
};
