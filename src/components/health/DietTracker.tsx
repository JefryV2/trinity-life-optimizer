import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Utensils, Plus, Target, TrendingUp } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface FoodEntry {
  id: string;
  food_name: string;
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  consumed_at: string;
}

interface HealthProfile {
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  goal_type: string;
  daily_caloric_target: number;
  activity_level: string;
  gender: string;
}

export function DietTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTodaysFoodEntries();
      fetchHealthProfile();
    }
  }, [user]);

  const fetchTodaysFoodEntries = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user?.id)
        .gte('consumed_at', `${today}T00:00:00.000Z`)
        .lt('consumed_at', `${today}T23:59:59.999Z`)
        .order('consumed_at', { ascending: false });

      if (error) throw error;
      setFoodEntries(data || []);
    } catch (error) {
      console.error('Error fetching food entries:', error);
    }
  };

  const fetchHealthProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles_health')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setHealthProfile(data);
    } catch (error) {
      console.error('Error fetching health profile:', error);
    }
  };

  const addFoodEntry = async () => {
    if (!user || !foodName || !calories || !mealType) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('food_entries')
        .insert({
          user_id: user.id,
          food_name: foodName,
          total_calories: Number(calories),
          protein_g: Number(protein) || 0,
          carbs_g: Number(carbs) || 0,
          fat_g: Number(fat) || 0,
          meal_type: mealType,
          consumed_at: new Date().toISOString()
        });

      if (error) throw error;

      window.dispatchEvent(new CustomEvent('foodEntriesUpdated'));
      window.dispatchEvent(new CustomEvent('healthOverviewDataUpdated'));

      toast({
        title: "Food logged successfully",
        description: `${foodName} added to ${mealType}`
      });

      // Reset form
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setMealType('');
      
      fetchTodaysFoodEntries();
    } catch (error) {
      console.error('Error adding food entry:', error);
      toast({
        title: "Error logging food",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBMI = () => {
    if (!healthProfile?.height_cm || !healthProfile?.weight_kg) return 0;
    const heightM = healthProfile.height_cm / 100;
    return Math.round((healthProfile.weight_kg / (heightM * heightM)) * 10) / 10;
  };

  const getTotalCalories = () => {
    return foodEntries.reduce((sum, entry) => sum + (entry.total_calories || 0), 0);
  };

  const getTotalMacro = (macro: 'protein_g' | 'carbs_g' | 'fat_g') => {
    return Math.round(foodEntries.reduce((sum, entry) => sum + (entry[macro] || 0), 0));
  };

  const getCalorieProgress = () => {
    if (!healthProfile?.daily_caloric_target) return 0;
    return Math.min((getTotalCalories() / healthProfile.daily_caloric_target) * 100, 100);
  };

  const getMealEntries = (meal: string) => {
    return foodEntries.filter(entry => entry.meal_type === meal);
  };

  return (
    <div className="space-y-6 px-4 pb-6">
      {/* Log Food Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            Diet Tracker
          </CardTitle>
          <CardDescription className="text-sm">Track your daily nutrition and calories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Food Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="food-name" className="text-sm font-medium">Food Name</Label>
              <Input
                id="food-name"
                placeholder="e.g., Grilled chicken breast"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-type" className="text-sm font-medium">Meal Type</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                  <SelectItem value="lunch">☀️ Lunch</SelectItem>
                  <SelectItem value="dinner">🌙 Dinner</SelectItem>
                  <SelectItem value="snack">🍎 Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nutrition Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories" className="text-sm font-medium">Calories</Label>
              <Input
                id="calories"
                type="number"
                placeholder="250"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="h-12 text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein" className="text-sm font-medium">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                placeholder="25"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="h-12 text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs" className="text-sm font-medium">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                placeholder="30"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="h-12 text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat" className="text-sm font-medium">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                placeholder="10"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="h-12 text-center"
              />
            </div>
          </div>

          {/* Log Button */}
          <Button 
            onClick={addFoodEntry} 
            disabled={!foodName || !calories || !mealType || isLoading}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Log Food
          </Button>
        </CardContent>
      </Card>

      {/* Daily Goals Card */}
      {healthProfile && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              Daily Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Calorie Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Calories</span>
                <span className="text-sm text-muted-foreground">
                  {getTotalCalories()}/{healthProfile.daily_caloric_target || 2000}
                </span>
              </div>
              <Progress value={getCalorieProgress()} className="h-3" />
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {getTotalMacro('protein_g')}g
                </div>
                <p className="text-xs text-muted-foreground mt-1">Protein</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {getTotalMacro('carbs_g')}g
                </div>
                <p className="text-xs text-muted-foreground mt-1">Carbs</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {getTotalMacro('fat_g')}g
                </div>
                <p className="text-xs text-muted-foreground mt-1">Fat</p>
              </div>
            </div>

            {/* BMI Display */}
            {calculateBMI() > 0 && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-lg font-semibold">BMI: {calculateBMI()}</div>
                <div className="text-sm text-muted-foreground">
                  Goal: {healthProfile.goal_type} weight
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's Meals Card */}
      {foodEntries.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Today's Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['breakfast', 'lunch', 'dinner', 'snack'].map(meal => {
                const mealEntries = getMealEntries(meal);
                if (mealEntries.length === 0) return null;
                
                const mealEmojis = {
                  breakfast: '🌅',
                  lunch: '☀️',
                  dinner: '🌙',
                  snack: '🍎'
                };
                
                return (
                  <div key={meal} className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <span>{mealEmojis[meal as keyof typeof mealEmojis]}</span>
                      <span className="capitalize">{meal}</span>
                    </h4>
                    {mealEntries.map((entry) => (
                      <div key={entry.id} className="flex justify-between items-center p-3 bg-card border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{entry.food_name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            P: {entry.protein_g}g • C: {entry.carbs_g}g • F: {entry.fat_g}g
                          </div>
                        </div>
                        <Badge variant="secondary" className="px-3 py-1 font-medium">
                          {entry.total_calories} cal
                        </Badge>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}