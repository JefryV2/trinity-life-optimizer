import type { Micronutrients } from '@/lib/nutrition';

export type PendingMealComponent = {
  name: string;
  grams: number;
  per100: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    micros?: Micronutrients;
  };
};

let pending: PendingMealComponent | null = null;

export const setPendingMealComponent = (component: PendingMealComponent) => {
  pending = component;
};

export const takePendingMealComponent = () => {
  const value = pending;
  pending = null;
  return value;
};
