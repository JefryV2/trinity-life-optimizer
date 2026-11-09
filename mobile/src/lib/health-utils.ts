/** Mifflin-St Jeor estimate, mirroring the web app's calorie goal logic. */

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const calculateCalorieTarget = (input: {
  gender: string | null;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  goalType: string;
}): number => {
  const base =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + (input.gender === 'male' ? 5 : -161);
  const maintain = base * (ACTIVITY_FACTOR[input.activityLevel] ?? 1.375);
  const adjusted =
    input.goalType === 'lose' ? maintain - 500 : input.goalType === 'gain' ? maintain + 300 : maintain;
  return Math.max(1200, Math.round(adjusted / 10) * 10);
};

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Mostly sitting' },
  { value: 'light', label: 'Lightly active' },
  { value: 'moderate', label: 'Moderately active' },
  { value: 'active', label: 'Very active' },
  { value: 'very_active', label: 'Athlete' },
];

export const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Build muscle' },
];