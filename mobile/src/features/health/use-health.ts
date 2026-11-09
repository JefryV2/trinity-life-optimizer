import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isoDate, startOfDay } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface SleepRecord {
  id: string;
  sleep_quality: number | null;
  sleep_duration_hours: number | null;
  bedtime: string | null;
  wake_time: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExerciseRecord {
  id: string;
  exercise_name: string;
  exercise_type: string | null;
  duration_minutes: number | null;
  calories_burned: number | null;
  intensity: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface StepRecord {
  id: string;
  date: string;
  steps: number;
}

export interface HydrationRecord {
  id: string;
  date: string;
  water_intake_ml: number;
  target_ml: number | null;
  cups_consumed: number;
}

export interface FoodEntry {
  id: string;
  food_name: string;
  meal_type: string | null;
  servings: number | null;
  total_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  consumed_at: string | null;
}

export interface MentalRecord {
  id: string;
  mood_rating: number | null;
  stress_level: number | null;
  energy_level: number | null;
  anxiety_level: number | null;
  notes: string | null;
  logged_at: string | null;
}

export interface CycleRecord {
  id: string;
  cycle_start_date: string;
  cycle_end_date: string | null;
  flow_intensity: string | null;
  pain_level: number | null;
  symptoms: string[] | null;
  notes: string | null;
}

export interface HealthGoal {
  id: string;
  title: string;
  description: string | null;
  goal_type: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  target_date: string | null;
  status: string | null;
}

export interface HealthData {
  sleep: SleepRecord[];
  exercise: ExerciseRecord[];
  steps: StepRecord[];
  hydration: HydrationRecord | null;
  food: FoodEntry[];
  mental: MentalRecord[];
  cycles: CycleRecord[];
  goals: HealthGoal[];
}

const invalidate = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['health'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['insights'] }),
  ]);
};

export const useHealth = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['health', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<HealthData> => {
      const today = isoDate();
      const dayStart = startOfDay().toISOString();
      const dayEnd = new Date(startOfDay().getTime() + 86_400_000).toISOString();

      const [sleep, exercise, steps, hydration, food, mental, cycles, goals] =
        await Promise.all([
          supabase
            .from('sleep_records')
            .select('id,sleep_quality,sleep_duration_hours,bedtime,wake_time,notes,created_at')
            .eq('user_id', userId!)
            .order('created_at', { ascending: false })
            .limit(14),
          supabase
            .from('exercise_records')
            .select(
              'id,exercise_name,exercise_type,duration_minutes,calories_burned,intensity,completed_at,notes',
            )
            .eq('user_id', userId!)
            .order('completed_at', { ascending: false })
            .limit(20),
          supabase
            .from('step_records')
            .select('id,date,steps')
            .eq('user_id', userId!)
            .order('date', { ascending: false })
            .limit(14),
          supabase
            .from('hydration_records')
            .select('id,date,water_intake_ml,target_ml,cups_consumed')
            .eq('user_id', userId!)
            .eq('date', today)
            .maybeSingle(),
          supabase
            .from('food_entries')
            .select(
              'id,food_name,meal_type,servings,total_calories,protein_g,carbs_g,fat_g,consumed_at',
            )
            .eq('user_id', userId!)
            .gte('consumed_at', dayStart)
            .lte('consumed_at', dayEnd)
            .order('consumed_at', { ascending: false }),
          supabase
            .from('mental_health_logs')
            .select('id,mood_rating,stress_level,energy_level,anxiety_level,notes,logged_at')
            .eq('user_id', userId!)
            .order('logged_at', { ascending: false })
            .limit(14),
          supabase
            .from('menstrual_cycles')
            .select('id,cycle_start_date,cycle_end_date,flow_intensity,pain_level,symptoms,notes')
            .eq('user_id', userId!)
            .order('cycle_start_date', { ascending: false })
            .limit(6),
          supabase
            .from('health_goals')
            .select(
              'id,title,description,goal_type,target_value,current_value,unit,target_date,status',
            )
            .eq('user_id', userId!)
            .order('created_at', { ascending: false }),
        ]);

      const failure = [sleep, exercise, steps, food, mental, cycles, goals].find(
        (result) => result.error,
      );
      if (failure?.error) throw new Error(failure.error.message);

      return {
        sleep: (sleep.data ?? []) as SleepRecord[],
        exercise: (exercise.data ?? []) as ExerciseRecord[],
        steps: (steps.data ?? []) as StepRecord[],
        hydration: (hydration.data ?? null) as HydrationRecord | null,
        food: (food.data ?? []) as FoodEntry[],
        mental: (mental.data ?? []) as MentalRecord[],
        cycles: (cycles.data ?? []) as CycleRecord[],
        goals: (goals.data ?? []) as HealthGoal[],
      };
    },
  });

  const addSleep = useMutation({
    mutationFn: async (input: {
      hours: number;
      quality: number;
      bedtime?: string;
      wakeTime?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('sleep_records').insert({
        user_id: userId!,
        sleep_duration_hours: input.hours,
        sleep_quality: input.quality,
        bedtime: input.bedtime || null,
        wake_time: input.wakeTime || null,
        notes: input.notes?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addExercise = useMutation({
    mutationFn: async (input: {
      name: string;
      type: string;
      duration: number;
      calories: number;
      intensity: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('exercise_records').insert({
        user_id: userId!,
        exercise_name: input.name.trim(),
        exercise_type: input.type,
        duration_minutes: input.duration,
        calories_burned: input.calories,
        intensity: input.intensity,
        completed_at: new Date().toISOString(),
        notes: input.notes?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const saveSteps = useMutation({
    mutationFn: async (steps: number) => {
      const today = isoDate();
      const existing = await supabase
        .from('step_records')
        .select('id')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle();

      if (existing.data?.id) {
        const { error } = await supabase
          .from('step_records')
          .update({ steps })
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('step_records')
          .insert({ user_id: userId!, date: today, steps });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addWater = useMutation({
    mutationFn: async (millilitres: number) => {
      const today = isoDate();
      const existing = await supabase
        .from('hydration_records')
        .select('id,water_intake_ml,target_ml')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle();

      if (existing.data?.id) {
        const next = Number(existing.data.water_intake_ml ?? 0) + millilitres;
        const { error } = await supabase
          .from('hydration_records')
          .update({
            water_intake_ml: next,
            cups_consumed: Math.round(next / 250),
            last_drink_time: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('hydration_records').insert({
          user_id: userId!,
          date: today,
          water_intake_ml: millilitres,
          target_ml: 2500,
          cups_consumed: Math.round(millilitres / 250),
          last_drink_time: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => invalidate(queryClient),
  });

  const setWaterTarget = useMutation({
    mutationFn: async (target: number) => {
      const today = isoDate();
      const existing = await supabase
        .from('hydration_records')
        .select('id')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle();

      if (existing.data?.id) {
        const { error } = await supabase
          .from('hydration_records')
          .update({ target_ml: target, updated_at: new Date().toISOString() })
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('hydration_records').insert({
          user_id: userId!,
          date: today,
          water_intake_ml: 0,
          target_ml: target,
          cups_consumed: 0,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addFood = useMutation({
    mutationFn: async (input: {
      name: string;
      meal: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }) => {
      const { error } = await supabase.from('food_entries').insert({
        user_id: userId!,
        food_name: input.name.trim(),
        meal_type: input.meal,
        servings: 1,
        total_calories: input.calories,
        calories_per_serving: input.calories,
        protein_g: input.protein,
        carbs_g: input.carbs,
        fat_g: input.fat,
        consumed_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addMental = useMutation({
    mutationFn: async (input: {
      mood: number;
      stress: number;
      energy: number;
      notes?: string;
    }) => {
      const { error } = await supabase.from('mental_health_logs').insert({
        user_id: userId!,
        mood_rating: input.mood,
        stress_level: input.stress,
        energy_level: input.energy,
        notes: input.notes?.trim() || null,
        logged_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addCycle = useMutation({
    mutationFn: async (input: {
      startDate: string;
      flow: string;
      pain: number;
      notes?: string;
    }) => {
      const { error } = await supabase.from('menstrual_cycles').insert({
        user_id: userId!,
        cycle_start_date: input.startDate,
        flow_intensity: input.flow,
        pain_level: input.pain,
        notes: input.notes?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addGoal = useMutation({
    mutationFn: async (input: {
      title: string;
      target: number;
      unit: string;
      type: string;
    }) => {
      const { error } = await supabase.from('health_goals').insert({
        user_id: userId!,
        title: input.title.trim(),
        target_value: input.target,
        current_value: 0,
        unit: input.unit,
        goal_type: input.type,
        status: 'active',
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const deleteRecord = useMutation({
    mutationFn: async (input: {
      table:
        | 'sleep_records'
        | 'exercise_records'
        | 'mental_health_logs'
        | 'food_entries'
        | 'menstrual_cycles'
        | 'health_goals';
      id: string;
    }) => {
      const { error } = await supabase.from(input.table).delete().eq('id', input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  return {
    ...query,
    addSleep,
    addExercise,
    saveSteps,
    addWater,
    setWaterTarget,
    addFood,
    addMental,
    addCycle,
    addGoal,
    deleteRecord,
  };
};
