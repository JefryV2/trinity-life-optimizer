import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Json } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  tier: string | null;
  data_preferences: Record<string, unknown> | null;
}

export interface HealthProfile {
  id: string;
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  goal_type: string | null;
  daily_caloric_target: number | null;
  resting_heart_rate: number | null;
}

export interface ProfileData {
  profile: Profile | null;
  health: HealthProfile | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfileData> => {
      const [profile, health] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,first_name,last_name,tier,data_preferences')
          .eq('user_id', userId!)
          .maybeSingle(),
        supabase
          .from('user_profiles_health')
          .select(
            'id,birth_date,gender,height_cm,weight_kg,target_weight_kg,activity_level,goal_type,daily_caloric_target,resting_heart_rate',
          )
          .eq('user_id', userId!)
          .maybeSingle(),
      ]);

      return {
        profile: (profile.data ?? null) as Profile | null,
        health: (health.data ?? null) as HealthProfile | null,
      };
    },
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const saveProfile = useMutation({
    mutationFn: async (input: { firstName: string; lastName: string }) => {
      const existing = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId!)
        .maybeSingle();

      const payload = {
        first_name: input.firstName.trim() || null,
        last_name: input.lastName.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (existing.data?.id) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('profiles').insert({ ...payload, user_id: userId! });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
  });

  const saveHealthProfile = useMutation({
    mutationFn: async (input: {
      birthDate: string | null;
      gender: string | null;
      heightCm: number | null;
      weightKg: number | null;
      targetWeightKg: number | null;
      activityLevel: string | null;
      goalType: string | null;
      dailyCalories: number | null;
    }) => {
      const existing = await supabase
        .from('user_profiles_health')
        .select('id')
        .eq('user_id', userId!)
        .maybeSingle();

      const payload = {
        birth_date: input.birthDate,
        gender: input.gender,
        height_cm: input.heightCm,
        weight_kg: input.weightKg,
        target_weight_kg: input.targetWeightKg,
        activity_level: input.activityLevel,
        goal_type: input.goalType,
        daily_caloric_target: input.dailyCalories,
        updated_at: new Date().toISOString(),
      };

      if (existing.data?.id) {
        const { error } = await supabase
          .from('user_profiles_health')
          .update(payload)
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('user_profiles_health')
          .insert({ ...payload, user_id: userId! });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
  });

  const savePreferences = useMutation({
    mutationFn: async (preferences: Record<string, unknown>) => {
      const existing = await supabase
        .from('profiles')
        .select('id,data_preferences')
        .eq('user_id', userId!)
        .maybeSingle();

      const merged = {
        ...((existing.data?.data_preferences as Record<string, unknown> | null) ?? {}),
        ...preferences,
      };

      if (existing.data?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ data_preferences: merged as unknown as Json, updated_at: new Date().toISOString() })
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('profiles').insert({
          user_id: userId!,
          data_preferences: merged as unknown as Json,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
  });

  const completeOnboarding = useMutation({
    mutationFn: async (input: {
      firstName: string;
      lastName?: string;
      focus: 'health' | 'wealth' | 'relations';
      goal: string;
    }) => {
      const existing = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId!)
        .maybeSingle();

      const payload = {
        first_name: input.firstName.trim(),
        last_name: input.lastName?.trim() || null,
        data_preferences: {
          focus: input.focus,
          onboarding_goal: input.goal.trim(),
          onboarding_completed: true,
          onboarded_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      if (existing.data?.id) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('profiles').insert({ ...payload, user_id: userId! });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
  });

  return {
    ...query,
    saveProfile,
    saveHealthProfile,
    savePreferences,
    completeOnboarding,
  };
};
