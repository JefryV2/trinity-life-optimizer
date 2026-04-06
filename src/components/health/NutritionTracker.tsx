import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Utensils, ArrowLeft, Camera } from "lucide-react";
import { format } from 'date-fns';
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FoodSearch, type USDAFood } from "./FoodSearch";
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
  const { toast } = useToast();
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [searchMealType, setSearchMealType] = useState<
    'breakfast' | 'lunch' | 'dinner' | 'snack'
  >('lunch');
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

  const logSearchedFood = async (food: USDAFood) => {
    if (!user) {
      toast({
        title: 'Sign in to log food',
        description: 'Create an account or sign in so meals save to your diary.',
        variant: 'destructive',
      });
      return;
    }

    const n = food.nutrients;
    try {
      const { error } = await supabase.from('food_entries').insert({
        user_id: user.id,
        food_name: food.description,
        total_calories: Math.round(n.calories ?? 0),
        protein_g: n.protein ?? 0,
        carbs_g: n.carbs ?? 0,
        fat_g: n.fat ?? 0,
        fiber_g: n.fiber ?? 0,
        sugar_g: n.sugar ?? 0,
        sodium_mg: n.sodium ?? 0,
        meal_type: searchMealType,
        servings: 1,
        notes: JSON.stringify({
          source: 'usda_search',
          dataType: food.dataType,
          fdc_id: food.fdcId,
        }),
        consumed_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Food logged',
        description: `${food.description.slice(0, 60)}${food.description.length > 60 ? '…' : ''} · ${searchMealType}`,
      });
      setShowFoodSearch(false);
      fetchTodaysEntries();
      window.dispatchEvent(new CustomEvent('foodEntriesUpdated'));
      window.dispatchEvent(new CustomEvent('healthOverviewDataUpdated'));
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not save food',
        description: e instanceof Error ? e.message : 'Try again or use Quick Food Entry.',
        variant: 'destructive',
      });
    }
  };

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Search Food Database</h2>
          <Button variant="outline" onClick={() => setShowFoodSearch(false)}>
            Back to Nutrition
          </Button>
        </div>
        <div className="flex flex-col gap-2 max-w-xs">
          <span className="text-sm text-muted-foreground">Log selected foods as</span>
          <Select
            value={searchMealType}
            onValueChange={(v) =>
              setSearchMealType(v as 'breakfast' | 'lunch' | 'dinner' | 'snack')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FoodSearch onFoodSelect={logSearchedFood} />
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
          <Button
            variant="outline"
            onClick={() => {
              setShowDietTracker(false);
              fetchTodaysEntries();
            }}
          >
            Back to Nutrition
          </Button>
        </div>
        <DietTracker />
      </div>
    );
  }

  // Calculate macronutrient percentages
  const getMacroPercentage = (current: number, totalCalories: number, caloriesPerGram: number) => {
    if (totalCalories === 0) return 0;
    const macroCalories = current * caloriesPerGram;
    return Math.round((macroCalories / totalCalories) * 100 * 100) / 100;
  };

  const carbsPercent = getMacroPercentage(todaysNutrition.carbs, todaysNutrition.calories || 1, 4);
  const proteinPercent = getMacroPercentage(todaysNutrition.protein, todaysNutrition.calories || 1, 4);
  const fatPercent = getMacroPercentage(todaysNutrition.fat, todaysNutrition.calories || 1, 9);
  const fiberPercent = getMacroPercentage(todaysNutrition.fiber, targets.fiber || 1, 0); // Fiber doesn't contribute calories

  // Circular progress component
  const CircularMacro = ({ 
    label, 
    percentage, 
    color 
  }: { 
    label: string; 
    percentage: number; 
    color: string;
  }) => {
    const circumference = 2 * Math.PI * 30;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-16 h-16">
          <svg className="transform -rotate-90 w-16 h-16">
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`${color} transition-all duration-500`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold">{Math.round(percentage)}%</span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground text-center">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Calories Intake</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'EEE, d MMM yyyy')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Total Calories */}
      <Card className="ios-card">
        <CardContent className="p-6 text-center">
          <p className="text-4xl font-bold">{Math.round(todaysNutrition.calories)}kcal</p>
        </CardContent>
      </Card>

      {/* Macronutrient Circular Indicators */}
      <Card className="ios-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-around">
            <CircularMacro 
              label="Carbs" 
              percentage={carbsPercent} 
              color="text-yellow-500" 
            />
            <CircularMacro 
              label="Protein" 
              percentage={proteinPercent} 
              color="text-red-500" 
            />
            <CircularMacro 
              label="Fat" 
              percentage={fatPercent} 
              color="text-blue-500" 
            />
            <CircularMacro 
              label="Fiber" 
              percentage={Math.min((todaysNutrition.fiber / targets.fiber) * 100, 100)} 
              color="text-green-500" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Meal list — stored in Supabase table food_entries */}
      <Card className="ios-card">
        <CardContent className="p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold">Today&apos;s meals</p>
            <p className="text-xs text-muted-foreground">
              Everything here is saved to your account (database: food_entries). Sign in to sync.
            </p>
          </div>
          {foodEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No meals logged today</p>
          ) : (
            <div className="space-y-3">
              {foodEntries.map((entry) => {
                const consumedTime = new Date(entry.consumed_at);
                const timeStr = format(consumedTime, 'hh.mm a').toLowerCase();
                return (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {timeStr} {entry.food_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({Math.round(entry.total_calories || 0)}kcal)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ways to log meals — all write to food_entries */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          onClick={() => setShowMealCreator(true)}
          className="h-14 flex items-center justify-center gap-2"
        >
          <Camera className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Build a meal</span>
        </Button>
        <Button
          onClick={() => setShowFoodSearch(true)}
          variant="outline"
          className="h-14 flex items-center justify-center gap-2"
        >
          <Search className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Search foods</span>
        </Button>
        <Button
          onClick={() => setShowDietTracker(true)}
          variant="outline"
          className="h-14 flex items-center justify-center gap-2"
        >
          <Utensils className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Quick add</span>
        </Button>
      </div>

    </div>
  );
}