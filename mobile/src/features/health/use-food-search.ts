import { useMutation } from '@tanstack/react-query';

import { searchFoods, type FoodResult } from '@/lib/food-api';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { supabase } from '@/lib/supabase';

export type FoodSearchResult = FoodResult;

/** Small local catalogue so search works in the offline demo. */
const DEMO_FOODS: FoodSearchResult[] = [
  { name: 'Greek yogurt, plain', calories: 59, protein: 10, carbs: 4, fat: 0, serving: 'per 100 g', micros: { calcium: 110, vitaminB12: 0.5, vitaminB2: 0.2 } },
  { name: 'Chicken breast, grilled', calories: 165, protein: 31, carbs: 0, fat: 4, serving: 'per 100 g', micros: { vitaminB6: 0.6, vitaminB12: 0.3, magnesium: 29, potassium: 256 } },
  { name: 'Salmon, baked', calories: 208, protein: 20, carbs: 0, fat: 13, serving: 'per 100 g', micros: { vitaminD: 10, vitaminB12: 3.2, vitaminB6: 0.6 } },
  { name: 'Brown rice, cooked', calories: 123, protein: 3, carbs: 26, fat: 1, serving: 'per 100 g', micros: { vitaminB1: 0.2, magnesium: 43 } },
  { name: 'Quinoa, cooked', calories: 120, protein: 4, carbs: 21, fat: 2, serving: 'per 100 g', micros: { magnesium: 64, iron: 1.5 } },
  { name: 'Banana', calories: 89, protein: 1, carbs: 23, fat: 0, serving: 'per 100 g', micros: { vitaminC: 8.7, vitaminB6: 0.4, potassium: 358, magnesium: 27 } },
  { name: 'Blueberries', calories: 57, protein: 1, carbs: 14, fat: 0, serving: 'per 100 g', micros: { vitaminC: 9.7, vitaminK: 19 } },
  { name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, serving: 'per 100 g', micros: { vitaminE: 25, magnesium: 270, calcium: 269, iron: 3.7 } },
  { name: 'Whole-wheat bread', calories: 247, protein: 13, carbs: 41, fat: 3, serving: 'per 100 g', micros: { iron: 2.5, magnesium: 82 } },
  { name: 'Olive oil', calories: 884, protein: 0, carbs: 0, fat: 100, serving: 'per 100 g', micros: { vitaminE: 14 } },
  { name: 'Egg, boiled', calories: 155, protein: 13, carbs: 1, fat: 11, serving: 'per 100 g', micros: { vitaminB12: 1.1, vitaminD: 2, folate: 47, iron: 1.2 } },
  { name: 'Broccoli, steamed', calories: 35, protein: 2, carbs: 7, fat: 0, serving: 'per 100 g', micros: { vitaminC: 89, vitaminK: 101, folate: 63, calcium: 47, iron: 0.73 } },
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
