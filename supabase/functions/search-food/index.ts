// @ts-nocheck
// This file runs in the Supabase Edge Runtime (Deno), not in the Vite/Node toolchain.
// We disable TypeScript checking here so local editors don't complain about Deno types.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, pageSize = 25 } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Using FoodData Central API - this is a public API, no key needed for basic search
    const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${Deno.env.get('USDA_API_KEY')}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Survey%20(FNDDS),Foundation,SR%20Legacy`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to a more usable format
    const foods = data.foods?.map((food: USDAFood) => {
      const nutrients: { [key: string]: number } = {};
      
      food.foodNutrients?.forEach(nutrient => {
        switch (nutrient.nutrientId) {
          case 1008: // Energy (calories)
            nutrients.calories = nutrient.value;
            break;
          case 1003: // Protein
            nutrients.protein = nutrient.value;
            break;
          case 1005: // Carbohydrate
            nutrients.carbs = nutrient.value;
            break;
          case 1004: // Total lipid (fat)
            nutrients.fat = nutrient.value;
            break;
          case 1079: // Fiber
            nutrients.fiber = nutrient.value;
            break;
          case 2000: // Sugars
            nutrients.sugar = nutrient.value;
            break;
          case 1093: // Sodium
            nutrients.sodium = nutrient.value;
            break;
          // Vitamins
          case 1106: // Vitamin A
            nutrients.vitaminA = nutrient.value;
            break;
          case 1162: // Vitamin C
            nutrients.vitaminC = nutrient.value;
            break;
          case 1114: // Vitamin D
            nutrients.vitaminD = nutrient.value;
            break;
          case 1109: // Vitamin E
            nutrients.vitaminE = nutrient.value;
            break;
          case 1185: // Vitamin K
            nutrients.vitaminK = nutrient.value;
            break;
          case 1165: // Thiamin (B1)
            nutrients.thiamin = nutrient.value;
            break;
          case 1166: // Riboflavin (B2)
            nutrients.riboflavin = nutrient.value;
            break;
          case 1167: // Niacin (B3)
            nutrients.niacin = nutrient.value;
            break;
          case 1175: // Vitamin B6
            nutrients.vitaminB6 = nutrient.value;
            break;
          case 1177: // Folate
            nutrients.folate = nutrient.value;
            break;
          case 1178: // Vitamin B12
            nutrients.vitaminB12 = nutrient.value;
            break;
          // Minerals
          case 1087: // Calcium
            nutrients.calcium = nutrient.value;
            break;
          case 1089: // Iron
            nutrients.iron = nutrient.value;
            break;
          case 1090: // Magnesium
            nutrients.magnesium = nutrient.value;
            break;
          case 1091: // Phosphorus
            nutrients.phosphorus = nutrient.value;
            break;
          case 1092: // Potassium
            nutrients.potassium = nutrient.value;
            break;
          case 1095: // Zinc
            nutrients.zinc = nutrient.value;
            break;
        }
      });

      return {
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        nutrients
      };
    }) || [];

    return new Response(
      JSON.stringify({ foods, totalHits: data.totalHits }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in search-food function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search foods' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});