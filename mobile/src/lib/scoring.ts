import { clamp } from '@/lib/format';

/**
 * The web app scores each pillar from the same records the native app reads.
 * These functions keep that behaviour in one place so Home, the pillar tabs
 * and Insights cannot disagree with each other.
 */

export interface SleepRow {
  sleep_quality: number | null;
  sleep_duration_hours: number | null;
  created_at: string;
}

export interface ExerciseRow {
  duration_minutes: number | null;
  calories_burned: number | null;
  completed_at: string | null;
}

export interface MentalRow {
  mood_rating: number | null;
  stress_level: number | null;
  energy_level: number | null;
}

export interface FinanceRow {
  balance: number | null;
}

export interface TransactionRow {
  amount: number;
  direction: string;
  category: string | null;
  occurred_at: string;
}

export interface InteractionRow {
  mood_rating: number | null;
  duration_minutes: number | null;
  occurred_at: string;
}

export const average = (values: number[]): number =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const healthScore = (
  sleep: SleepRow[],
  exercise: ExerciseRow[],
  mental: MentalRow[],
): number => {
  let score = 0;

  if (sleep.length) {
    const quality = average(sleep.map((row) => row.sleep_quality ?? 0));
    const duration = average(sleep.map((row) => row.sleep_duration_hours ?? 0));
    score += quality * 5 + (duration >= 7 ? 25 : duration * 3);
  }

  if (exercise.length) {
    const minutes = exercise.reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0);
    score += Math.min(minutes / 5, 35);
  }

  if (mental.length) {
    const mood = average(mental.map((row) => row.mood_rating ?? 0));
    const stress = average(mental.map((row) => row.stress_level ?? 0));
    score += mood * 3 - stress;
  }

  return Math.round(clamp(score));
};

export const savingsRate = (income: number, expenses: number): number =>
  income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

export const wealthScore = (
  accounts: FinanceRow[],
  transactions: TransactionRow[],
): number => {
  const income = transactions
    .filter((row) => row.direction === 'in')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const expenses = transactions
    .filter((row) => row.direction === 'out')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  if (income > 0 || expenses > 0) return Math.round(clamp(savingsRate(income, expenses)));

  // No transactions yet: a positive balance is a weak but honest signal.
  const netWorth = accounts.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
  return netWorth > 0 ? 40 : 0;
};

export const relationsScore = (interactions: InteractionRow[]): number => {
  if (!interactions.length) return 0;
  const mood = average(interactions.map((row) => row.mood_rating ?? 0));
  return Math.round(clamp(mood * 10));
};

export const trinityScore = (health: number, wealth: number, relations: number): number =>
  Math.round((health + wealth + relations) / 3);

export const monthTotals = (transactions: TransactionRow[]) => {
  const income = transactions
    .filter((row) => row.direction === 'in')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const expenses = transactions
    .filter((row) => row.direction === 'out')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return { income, expenses, saved: income - expenses };
};

export const spendingByCategory = (transactions: TransactionRow[]) => {
  const totals = new Map<string, number>();
  transactions
    .filter((row) => row.direction === 'out')
    .forEach((row) => {
      const category = row.category?.trim() || 'Uncategorized';
      totals.set(category, (totals.get(category) ?? 0) + Number(row.amount ?? 0));
    });
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
};

/** Pearson correlation; returns null when either series is flat or short. */
export const correlation = (xs: number[], ys: number[]): number | null => {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const x = xs.slice(0, n);
  const y = ys.slice(0, n);
  const mx = average(x);
  const my = average(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
};
