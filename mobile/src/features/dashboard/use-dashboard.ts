import { useQuery } from '@tanstack/react-query';

import { endOfMonth, isoDate, startOfDay, startOfMonth } from '@/lib/format';
import {
  healthScore,
  relationsScore,
  savingsRate,
  trinityScore,
  wealthScore,
  type ExerciseRow,
  type MentalRow,
  type SleepRow,
  type TransactionRow,
} from '@/lib/scoring';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface DashboardData {
  name: string;
  health: {
    score: number;
    sleepHours: number;
    sleepQuality: number;
    exerciseMinutes: number;
    steps: number;
    calories: number;
    water: number;
    waterTarget: number;
    mood: number;
    stress: number;
  };
  wealth: {
    score: number;
    netWorth: number;
    income: number;
    expenses: number;
    rate: number;
  };
  relations: {
    score: number;
    people: number;
    interactions: number;
    mood: number;
  };
  trinity: number;
  insights: Array<{
    title: string;
    body: string;
    pillar: 'health' | 'wealth' | 'relations';
    href: string;
  }>;
}

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const useDashboard = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<DashboardData> => {
      const userId = user!.id;
      const today = isoDate();
      const monthStart = startOfMonth().toISOString();
      const monthEnd = endOfMonth().toISOString();
      const dayStart = startOfDay().toISOString();
      const dayEnd = new Date(startOfDay().getTime() + 86_400_000).toISOString();

      const [
        profile,
        sleep,
        exercise,
        steps,
        food,
        mental,
        hydration,
        healthDaily,
        wealthDaily,
        relationsDaily,
        accounts,
        transactions,
        relationships,
        interactions,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name,last_name')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('sleep_records')
          .select('sleep_quality,sleep_duration_hours,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(7),
        supabase
          .from('exercise_records')
          .select('duration_minutes,calories_burned,completed_at')
          .eq('user_id', userId)
          .gte('completed_at', since(7))
          .order('completed_at', { ascending: false }),
        supabase
          .from('step_records')
          .select('steps')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('food_entries')
          .select('total_calories,protein_g,carbs_g,fat_g')
          .eq('user_id', userId)
          .gte('consumed_at', dayStart)
          .lte('consumed_at', dayEnd),
        supabase
          .from('mental_health_logs')
          .select('mood_rating,stress_level,energy_level')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false })
          .limit(7),
        supabase
          .from('hydration_records')
          .select('water_intake_ml,target_ml')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('health_daily_scores')
          .select('score')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1),
        supabase
          .from('wealth_daily_scores')
          .select('score')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1),
        supabase
          .from('relations_daily_scores')
          .select('score')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1),
        supabase.from('finance_accounts').select('balance').eq('user_id', userId),
        supabase
          .from('transactions')
          .select('amount,direction,category,occurred_at')
          .eq('user_id', userId)
          .gte('occurred_at', monthStart)
          .lte('occurred_at', monthEnd),
        supabase.from('relationships').select('id').eq('user_id', userId),
        supabase
          .from('interactions')
          .select('mood_rating,duration_minutes,occurred_at')
          .eq('user_id', userId)
          .gte('occurred_at', since(7)),
      ]);

      const sleepRows = (sleep.data ?? []) as SleepRow[];
      const exerciseRows = (exercise.data ?? []) as ExerciseRow[];
      const mentalRows = (mental.data ?? []) as MentalRow[];
      const transactionRows = (transactions.data ?? []) as TransactionRow[];

      const computedHealth = healthScore(sleepRows, exerciseRows, mentalRows);
      const computedWealth = wealthScore(accounts.data ?? [], transactionRows);
      const computedRelations = relationsScore(interactions.data ?? []);

      const health = healthDaily.data?.[0]?.score ?? computedHealth;
      const wealth = wealthDaily.data?.[0]?.score ?? computedWealth;
      const relations = relationsDaily.data?.[0]?.score ?? computedRelations;

      const income = transactionRows
        .filter((row) => row.direction === 'in')
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      const expenses = transactionRows
        .filter((row) => row.direction === 'out')
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

      const sleepHours =
        sleepRows.length > 0
          ? sleepRows.reduce((sum, row) => sum + (row.sleep_duration_hours ?? 0), 0) /
            sleepRows.length
          : 0;
      const sleepQuality =
        sleepRows.length > 0
          ? sleepRows.reduce((sum, row) => sum + (row.sleep_quality ?? 0), 0) /
            sleepRows.length
          : 0;
      const exerciseMinutes = exerciseRows.reduce(
        (sum, row) => sum + (row.duration_minutes ?? 0),
        0,
      );
      const mood =
        mentalRows.length > 0
          ? mentalRows.reduce((sum, row) => sum + (row.mood_rating ?? 0), 0) /
            mentalRows.length
          : 0;
      const stress =
        mentalRows.length > 0
          ? mentalRows.reduce((sum, row) => sum + (row.stress_level ?? 0), 0) /
            mentalRows.length
          : 0;
      const calories = (food.data ?? []).reduce(
        (sum, row) => sum + Number(row.total_calories ?? 0),
        0,
      );
      const interactionMood =
        (interactions.data ?? []).length > 0
          ? (interactions.data ?? []).reduce(
              (sum, row) => sum + (row.mood_rating ?? 0),
              0,
            ) / (interactions.data ?? []).length
          : 0;

      const insights: DashboardData['insights'] = [];

      if (sleepRows.length === 0) {
        insights.push({
          title: 'Start with last night',
          body: 'Log one sleep record to give the health score something real to read.',
          pillar: 'health',
          href: '/health/sleep',
        });
      } else if (sleepHours < 7) {
        insights.push({
          title: `You are ${(7 - sleepHours).toFixed(1)}h short on sleep`,
          body: 'The seven-day average is below the recovery target. One earlier night moves it.',
          pillar: 'health',
          href: '/health/sleep',
        });
      }

      if (exerciseRows.length < 3) {
        insights.push({
          title: 'Movement is thin this week',
          body: `${exerciseRows.length} session${exerciseRows.length === 1 ? '' : 's'} logged in seven days.`,
          pillar: 'health',
          href: '/health/activity',
        });
      }

      if (transactionRows.length === 0) {
        insights.push({
          title: 'Your money record is empty',
          body: 'Add an account and one transaction; the savings rate needs both sides.',
          pillar: 'wealth',
          href: '/wealth/accounts',
        });
      } else if (income > 0 && expenses > income) {
        insights.push({
          title: 'Spending is above income this month',
          body: `You are ${Math.round(((expenses - income) / income) * 100)}% over. Check the category split.`,
          pillar: 'wealth',
          href: '/wealth/transactions',
        });
      } else if (income === 0) {
        insights.push({
          title: 'No income recorded this month',
          body: 'Savings rate stays at zero until at least one inflow is logged.',
          pillar: 'wealth',
          href: '/wealth/transactions',
        });
      }

      if ((relationships.data ?? []).length === 0) {
        insights.push({
          title: 'Add the people who matter',
          body: 'Relationships need names before contact can be tracked.',
          pillar: 'relations',
          href: '/relations/people',
        });
      } else if ((interactions.data ?? []).length === 0) {
        insights.push({
          title: 'No contact logged this week',
          body: 'Log one conversation; the relations score reads contact quality, not message count.',
          pillar: 'relations',
          href: '/relations/people',
        });
      }

      return {
        name: profile.data?.first_name?.trim() || 'there',
        health: {
          score: health,
          sleepHours,
          sleepQuality,
          exerciseMinutes,
          steps: steps.data?.steps ?? 0,
          calories,
          water: hydration.data?.water_intake_ml ?? 0,
          waterTarget: hydration.data?.target_ml ?? 2500,
          mood,
          stress,
        },
        wealth: {
          score: wealth,
          netWorth: (accounts.data ?? []).reduce(
            (sum, row) => sum + Number(row.balance ?? 0),
            0,
          ),
          income,
          expenses,
          rate: savingsRate(income, expenses),
        },
        relations: {
          score: relations,
          people: (relationships.data ?? []).length,
          interactions: (interactions.data ?? []).length,
          mood: interactionMood,
        },
        trinity: trinityScore(health, wealth, relations),
        insights: insights.slice(0, 3),
      };
    },
  });
};
