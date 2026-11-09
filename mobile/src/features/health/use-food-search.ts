import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface FoodSearchResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

/**
 * The web client invoked a stale function name; the repo's deployed edge
 * function is search-food (USDA FoodData Central). If it is unreachable we
 * surface the error and the UI falls back to manual entry.
 */
export const useFoodSearch = () =>
  useMutation({
    mutationFn: async (query: string): Promise<FoodSearchResult[]> => {
      const { data, error } = await supabase.functions.invoke('search-food', {
        body: { query },
      });
      if (error) throw new Error('Food search is unavailable right now — log it manually instead.');
      const payload = data as {
        foods?: Array<{
          description?: string;
          nutrients?: {
            calories?: number;
            protein?: number;
            carbs?: number;
            fat?: number;
          };
        }>;
      };
      return (payload.foods ?? []).slice(0, 20).map((food) => ({
        name: food.description ?? 'Unknown food',
        calories: Math.round(food.nutrients?.calories ?? 0),
        protein: Math.round(food.nutrients?.protein ?? 0),
        carbs: Math.round(food.nutrients?.carbs ?? 0),
        fat: Math.round(food.nutrients?.fat ?? 0),
        serving: 'per 100g / serving',
      }));
    },
  });