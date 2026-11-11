import { useMutation } from '@tanstack/react-query';

import { searchFoods, type FoodResult } from '@/lib/food-api';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { supabase } from '@/lib/supabase';

export type FoodSearchResult = FoodResult;

/** Small local catalogue so search works in the offline demo. */
const DEMO_FOODS: FoodSearchResult[] = [
  { name: 'Greek yogurt, plain', calories: 59, protein: 10, carbs: 4, fat: 0, serving: 'per 100 g' },
  { name: 'Chicken breast, grilled', calories: 165, protein: 31, carbs: 0, fat: 4, serving: 'per 100 g' },
  { name: 'Salmon, baked', calories: 208, protein: 20, carbs: 0, fat: 13, serving: 'per 100 g' },
  { name: 'Brown rice, cooked', calories: 123, protein: 3, carbs: 26, fat: 1, serving: 'per 100 g' },
  { name: 'Quinoa, cooked', calories: 120, protein: 4, carbs: 21, fat: 2, serving: 'per 100 g' },
  { name: 'Banana', calories: 89, protein: 1, carbs: 23, fat: 0, serving: 'per 100 g' },
  { name: 'Blueberries', calories: 57, protein: 1, carbs: 14, fat: 0, serving: 'per 100 g' },
  { name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, serving: 'per 100 g' },
  { name: 'Whole-wheat bread', calories: 247, protein: 13, carbs: 41, fat: 3, serving: 'per 100 g' },
  { name: 'Olive oil', calories: 884, protein: 0, carbs: 0, fat: 100, serving: 'per 100 g' },
  { name: 'Egg, boiled', calories: 155, protein: 13, carbs: 1, fat: 11, serving: 'per 100 g' },
  { name: 'Broccoli, steamed', calories: 35, protein: 2, carbs: 7, fat: 0, serving: 'per 100 g' },
];

/**
 * Search order:
 *   1. Open Food Facts (no key, works today) — also handles a typed barcode.
 *   2. The `search-food` edge function (USDA) when it is deployed and reachable.
 *   3. A friendly error the UI can show above manual entry.
 */
export const useFoodSearch = () =>
  useMutation({
    mutationFn: async (query: string): Promise<FoodSearchResult[]> => {
      if (isDemoMode()) {
        const needle = query.trim().toLowerCase();
        if (!needle) return DEMO_FOODS.slice(0, 8);
        return DEMO_FOODS.filter((food) => food.name.toLowerCase().includes(needle)).slice(0, 20);
      }

      try {
        const results = await searchFoods(query);
        if (results.length > 0) return results;
      } catch {
        // Fall through to the server-side provider.
      }

      const { data, error } = await supabase.functions.invoke('search-food', {
        body: { query },
      });
      if (error) {
        throw new Error('Food search is unavailable right now — log it manually instead.');
      }
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
        serving: 'per 100 g',
      }));
    },
  });
