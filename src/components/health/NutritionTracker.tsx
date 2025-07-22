import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Target, TrendingUp, Apple, Droplets, Utensils } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { FoodSearch } from "./FoodSearch";
import { MealCreator } from "./MealCreator";
import { DietTracker } from "./DietTracker";

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
}

interface FoodEntry {
  id: string;
  food_name: string;
  meal_type: string;
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  sugar_g: number;
  consumed_at: string;
}

interface HealthProfile {
  daily_caloric_target: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  goal_type: string;
  activity_level: string;
  gender: string;
}

export function NutritionTracker() {
  const { user } = useAuth();
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showMealCreator, setShowMealCreator] = useState(false);
  const [showDietTracker, setShowDietTracker] = useState(false);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [todaysNutrition, setTodaysNutrition] = useState<NutritionData>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    sugar: 0
  });
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);

  // Dynamic targets based on user profile
  const getTargets = () => {
    const caloricTarget = healthProfile?.daily_caloric_target || 2000;
    return {
      calories: caloricTarget,
      protein: Math.round(caloricTarget * 0.3 / 4), // 30% of calories from protein (4 cal/g)
      carbs: Math.round(caloricTarget * 0.4 / 4), // 40% of calories from carbs (4 cal/g)
      fat: Math.round(caloricTarget * 0.3 / 9), // 30% of calories from fat (9 cal/g)
      fiber: 25, // Standard recommendation
      sodium: 2300, // Standard recommendation
      sugar: Math.round(caloricTarget * 0.1 / 4) // Max 10% of calories from sugar
    };
  };

  const vitamins = [
    { name: 'Vitamin D', current: 0, target: 20, unit: 'mcg', color: 'bg-yellow-500' },
    { name: 'Vitamin C', current: 0, target: 90, unit: 'mg', color: 'bg-orange-500' },
    { name: 'Iron', current: 0, target: 18, unit: 'mg', color: 'bg-red-500' },
    { name: 'Calcium', current: 0, target: 1000, unit: 'mg', color: 'bg-blue-500' },
    { name: 'B12', current: 0, target: 2.4, unit: 'mcg', color: 'bg-green-500' },
    { name: 'Folate', current: 0, target: 400, unit: 'mcg', color: 'bg-purple-500' }
  ];

  useEffect(() => {
    if (user) {
      fetchTodaysEntries();
      fetchHealthProfile();
    }
  }, [user]);

  const fetchHealthProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles_health')
        .select('daily_caloric_target, height_cm, weight_kg, target_weight_kg, goal_type, activity_level, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching health profile:', error);
        return;
      }

      setHealthProfile(data);
    } catch (error) {
      console.error('Error fetching health profile:', error);
    }
  };

  const fetchTodaysEntries = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('consumed_at', `${today}T00:00:00`)
        .lte('consumed_at', `${today}T23:59:59`)
        .order('consumed_at', { ascending: false });

      if (error) {
        console.error('Error fetching food entries:', error);
        return;
      }

      setFoodEntries(data || []);
      
      // Calculate totals
      const totals = (data || []).reduce((acc, entry) => ({
        calories: acc.calories + (entry.total_calories || 0),
        protein: acc.protein + (entry.protein_g || 0),
        carbs: acc.carbs + (entry.carbs_g || 0),
        fat: acc.fat + (entry.fat_g || 0),
        fiber: acc.fiber + (entry.fiber_g || 0),
        sodium: acc.sodium + (entry.sodium_mg || 0),
        sugar: acc.sugar + (entry.sugar_g || 0)
      }), {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sodium: 0,
        sugar: 0
      });

      setTodaysNutrition(totals);
    } catch (error) {
      console.error('Error fetching food entries:', error);
    }
  };

  const getNutrientProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const targets = getTargets();

  const groupedEntries = foodEntries.reduce((acc, entry) => {
    const mealType = entry.meal_type || 'other';
    if (!acc[mealType]) {
      acc[mealType] = [];
    }
    acc[mealType].push(entry);
    return acc;
  }, {} as Record<string, FoodEntry[]>);

  // Show different views based on state
  if (showFoodSearch) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Search Food Database</h2>
          <Button variant="outline" onClick={() => setShowFoodSearch(false)}>
            Back to Nutrition
          </Button>
        </div>
        <FoodSearch onFoodSelect={() => {
          setShowFoodSearch(false);
          fetchTodaysEntries();
        }} />
      </div>
    );
  }

  if (showMealCreator) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Meal</h2>
          <Button variant="outline" onClick={() => setShowMealCreator(false)}>
            Back to Nutrition
          </Button>
        </div>
        <MealCreator onMealSaved={() => {
          setShowMealCreator(false);
          fetchTodaysEntries();
        }} />
      </div>
    );
  }

  if (showDietTracker) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Quick Food Entry</h2>
          <Button variant="outline" onClick={() => setShowDietTracker(false)}>
            Back to Nutrition
          </Button>
        </div>
        <DietTracker />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Overview */}
      <Card className="health-gradient text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Daily Nutrition</p>
              <h2 className="text-3xl font-bold">{Math.round(todaysNutrition.calories)}</h2>
              <p className="text-white/70 text-sm">of {targets.calories} calories</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-white/90">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">
                  {todaysNutrition.calories > 0 ? 'Tracking' : 'Start logging'}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1">
                {Math.max(0, targets.calories - todaysNutrition.calories)} remaining
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={() => setShowFoodSearch(true)}
          className="ios-button-primary h-14 flex-col gap-1"
        >
          <Search className="h-4 w-4" />
          <span className="text-xs">Search</span>
        </Button>
        <Button
          onClick={() => setShowMealCreator(true)}
          variant="outline"
          className="ios-button-secondary h-14 flex-col gap-1"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">Meal</span>
        </Button>
        <Button
          onClick={() => setShowDietTracker(true)}
          variant="outline"
          className="ios-button-secondary h-14 flex-col gap-1"
        >
          <Utensils className="h-4 w-4" />
          <span className="text-xs">Quick Log</span>
        </Button>
      </div>

      {/* Macronutrients */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Macronutrients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: 'Protein', current: todaysNutrition.protein, target: targets.protein, unit: 'g', color: 'bg-red-500' },
            { name: 'Carbs', current: todaysNutrition.carbs, target: targets.carbs, unit: 'g', color: 'bg-yellow-500' },
            { name: 'Fat', current: todaysNutrition.fat, target: targets.fat, unit: 'g', color: 'bg-blue-500' }
          ].map((macro) => (
            <div key={macro.name}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{macro.name}</span>
                <span>{Math.round(macro.current)}/{macro.target}{macro.unit}</span>
              </div>
              <Progress value={getNutrientProgress(macro.current, macro.target)} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Fiber & Sodium - Same style as macros */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5" />
            Key Nutrients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: 'Fiber', current: todaysNutrition.fiber, target: targets.fiber, unit: 'g', color: 'bg-green-500' },
            { name: 'Sodium', current: todaysNutrition.sodium, target: targets.sodium, unit: 'mg', color: 'bg-purple-500' },
            { name: 'Sugar', current: todaysNutrition.sugar, target: targets.sugar, unit: 'g', color: 'bg-orange-500' }
          ].map((nutrient) => (
            <div key={nutrient.name}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{nutrient.name}</span>
                <span>{Math.round(nutrient.current)}/{nutrient.target}{nutrient.unit}</span>
              </div>
              <Progress value={getNutrientProgress(nutrient.current, nutrient.target)} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Vitamins & Minerals - Improved UI */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Vitamins & Minerals
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Vitamin and mineral tracking requires detailed food database integration. Currently showing baseline values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {vitamins.map((vitamin) => {
              const progress = vitamin.current > 0 ? (vitamin.current / vitamin.target) * 100 : 0;
              return (
                <div key={vitamin.name} className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg ${vitamin.color} flex items-center justify-center`}>
                      <Droplets className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{vitamin.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {Math.round(vitamin.current * 10) / 10}/{vitamin.target} {vitamin.unit}
                  </p>
                  <Progress value={Math.min(progress, 100)} className="h-1.5" />
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Vitamin and mineral tracking requires detailed food database integration. 
              Use the "Search\" feature to log foods with complete nutritional data, or \"Quick Log\" for manual entry.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Today's Meals */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle>Today's Meals</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedEntries).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No meals logged today</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEntries).map(([mealType, entries]) => (
                <div key={mealType} className="space-y-2">
                  <h4 className="font-medium capitalize">{mealType}</h4>
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{entry.food_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(entry.total_calories || 0)} cal • {Math.round(entry.protein_g || 0)}g protein
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(entry.consumed_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}