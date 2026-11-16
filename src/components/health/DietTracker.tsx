import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Settings } from "lucide-react";
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
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(
    null,
  );
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (user) {
      fetchTodaysFoodEntries();
      fetchHealthProfile();
    }
  }, [user]);
  const fetchTodaysFoodEntries = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("food_entries")
        .select("*")
        .eq("user_id", user?.id)
        .gte("consumed_at", `${today}T00:00:00.000Z`)
        .lt("consumed_at", `${today}T23:59:59.999Z`)
        .order("consumed_at", { ascending: false });
      if (error) throw error;
      setFoodEntries(data || []);
    } catch (error) {
      console.error("Error fetching food entries:", error);
    }
  };
  const fetchHealthProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles_health")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      setHealthProfile(data);
    } catch (error) {
      console.error("Error fetching health profile:", error);
    }
  };
  const addFoodEntry = async () => {
    if (!user || !foodName || !calories || !mealType) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("food_entries")
        .insert({
          user_id: user.id,
          food_name: foodName,
          total_calories: Number(calories),
          protein_g: Number(protein) || 0,
          carbs_g: Number(carbs) || 0,
          fat_g: Number(fat) || 0,
          meal_type: mealType,
          consumed_at: new Date().toISOString(),
        });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("foodEntriesUpdated"));
      window.dispatchEvent(new CustomEvent("healthOverviewDataUpdated"));
      toast({
        title: "Food logged successfully",
        description: `${foodName} added to ${mealType}`,
      }); // Reset form
      setFoodName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setMealType("");
      fetchTodaysFoodEntries();
    } catch (error) {
      console.error("Error adding food entry:", error);
      toast({
        title: "Error logging food",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const calculateBMI = () => {
    if (!healthProfile?.height_cm || !healthProfile?.weight_kg) return 0;
    const heightM = healthProfile.height_cm / 100;
    return (
      Math.round((healthProfile.weight_kg / (heightM * heightM)) * 10) / 10
    );
  };
  const getTotalCalories = () => {
    return foodEntries.reduce(
      (sum, entry) => sum + (entry.total_calories || 0),
      0,
    );
  };
  const getTotalMacro = (macro: "protein_g" | "carbs_g" | "fat_g") => {
    return Math.round(
      foodEntries.reduce((sum, entry) => sum + (entry[macro] || 0), 0),
    );
  };
  const getCalorieProgress = () => {
    if (!healthProfile?.daily_caloric_target) return 0;
    return Math.min(
      (getTotalCalories() / healthProfile.daily_caloric_target) * 100,
      100,
    );
  };
  const getMealEntries = (meal: string) => {
    return foodEntries.filter((entry) => entry.meal_type === meal);
  };
  const targets = useMemo(() => {
    const caloriesTarget = Number(healthProfile?.daily_caloric_target || 2000); // Simple macro split for UI targets (keeps logic local; adjust later if you add real macro targets to profile)
    const proteinG = Math.round((caloriesTarget * 0.25) / 4);
    const carbsG = Math.round((caloriesTarget * 0.45) / 4);
    const fatG = Math.round((caloriesTarget * 0.3) / 9);
    return { caloriesTarget, proteinG, carbsG, fatG };
  }, [healthProfile?.daily_caloric_target]);
  const bmiInfo = useMemo(() => {
    const bmi = calculateBMI();
    if (!bmi || bmi <= 0) return null;
    if (bmi >= 30)
      return {
        label: "ALERT",
        note: "High-intensity focus recommended for optimal health zone.",
      };
    if (bmi >= 25)
      return { label: "WATCH", note: "Small daily adjustments compound fast." };
    if (bmi >= 18.5)
      return { label: "GOOD", note: "Maintain your current rhythm." };
    return { label: "LOW", note: "Consider a nutrition boost for stability." };
  }, [healthProfile?.height_cm, healthProfile?.weight_kg]);
  return (
    <div className="pb-6 animate-in fade-in duration-500">
      {/* Top app bar (like screenshot) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black">
            T
          </div>
          <span className="text-sm font-semibold text-foreground">
            Vitality Hub
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Settings className="h-4 w-4 text-[#b4b4bb]" />
        </Button>
      </div>
      {/* Quick Entry header */}
      <div className="mb-5">
        <h1 className="text-4xl font-black tracking-tight text-foreground">
          Quick Entry
        </h1>
        <p className="text-sm text-[#b4b4bb] mt-1">
          Optimize your daily nutrition sanctuary.
        </p>
      </div>
      {/* Quick entry card */}
      <Card className="bg-card rounded-3xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <span className="text-lg">🍴</span> Diet Tracker
            </CardTitle>
            <span className="text-[10px] font-black tracking-widest uppercase bg-muted/40 text-[#b4b4bb] px-3 py-1 rounded-full">
              New entry
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
              Food name
            </p>
            <Input
              placeholder="e.g. Avocado Toast"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="h-12 rounded-full bg-[#0a0a0c]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
              Meal type
            </p>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger className="h-12 rounded-full bg-[#0a0a0c]">
                <SelectValue placeholder="Breakfast" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Nutrition 2x2 pills */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-muted/30 rounded-3xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb] mb-1">
                Calories
              </p>
              <Input
                type="number"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="h-10 rounded-2xl bg-[#0a0a0c] text-center"
              />
            </div>
            <div className="bg-muted/30 rounded-3xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb] mb-1">
                Protein (g)
              </p>
              <Input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="h-10 rounded-2xl bg-[#0a0a0c] text-center"
              />
            </div>
            <div className="bg-muted/30 rounded-3xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb] mb-1">
                Carbs (g)
              </p>
              <Input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="h-10 rounded-2xl bg-[#0a0a0c] text-center"
              />
            </div>
            <div className="bg-muted/30 rounded-3xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb] mb-1">
                Fat (g)
              </p>
              <Input
                type="number"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="h-10 rounded-2xl bg-[#0a0a0c] text-center"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addFoodEntry}
            disabled={!foodName || !calories || !mealType || isLoading}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground text-sm font-black tracking-widest uppercase shadow-[0_14px_26px_rgba(229,90,61,0.35)] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:shadow-none"
          >
            {isLoading ? "Logging..." : "Log Entry"}
          </button>
        </CardContent>
      </Card>
      {/* Daily goals */}
      {healthProfile && (
        <Card className="bg-card rounded-3xl shadow-sm mt-5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-black text-foreground">
                  Daily Goals
                </p>
                <p className="text-xs text-[#b4b4bb] mt-1">
                  Tracking towards your target rhythm.
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#b4b4bb] leading-none">
                  {Math.round(getTotalCalories())}
                </p>
                <p className="text-xs text-[#b4b4bb] mt-1">
                  {targets.caloriesTarget} kcal
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={getCalorieProgress()} className="h-2" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
                  Protein
                </span>
                <span className="text-xs font-semibold text-[#b4b4bb]">
                  {getTotalMacro("protein_g")}g / {targets.proteinG}g
                </span>
              </div>
              <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
                  Carbs
                </span>
                <span className="text-xs font-semibold text-[#b4b4bb]">
                  {getTotalMacro("carbs_g")}g / {targets.carbsG}g
                </span>
              </div>
              <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
                  Fat
                </span>
                <span className="text-xs font-semibold text-[#b4b4bb]">
                  {getTotalMacro("fat_g")}g / {targets.fatG}g
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* BMI card */}
      {bmiInfo && (
        <div className="mt-5 rounded-3xl p-5 bg-primary text-primary-foreground relative overflow-hidden">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-primary-foreground/60">
            Current BMI metric
          </p>
          <div className="mt-2 flex items-end justify-between">
            <div className="flex items-end gap-3">
              <p className="text-5xl font-black leading-none">
                {calculateBMI()}
              </p>
              <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1 rounded-full mb-2">
                {bmiInfo.label}
              </span>
            </div>
            <div className="h-9 w-9 rounded-full bg-[#101012] flex items-center justify-center">
              <span className="text-primary-foreground/70 text-xs font-black">
                i
              </span>
            </div>
          </div>
          <p className="text-xs text-primary-foreground/70 mt-2 max-w-[320px]">
            {bmiInfo.note}
          </p>
        </div>
      )}
      {/* Keep meals list (below) for functionality, but visually compact */}
      {foodEntries.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-lg font-black text-foreground">
              Today&apos;s Meals
            </p>
          </div>
          <div className="space-y-3">
            {["breakfast", "lunch", "dinner", "snack"].map((meal) => {
              const mealEntries = getMealEntries(meal);
              if (mealEntries.length === 0) return null;
              return (
                <div key={meal} className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
                    {meal}
                  </p>
                  {mealEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-[#0a0a0c] rounded-3xl p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {entry.food_name}
                        </p>
                        <p className="text-[10px] text-[#b4b4bb] mt-1">
                          P: {entry.protein_g}g • C: {entry.carbs_g}g • F:
                          {entry.fat_g}g
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-muted/40 text-[#b4b4bb] px-3 py-1 rounded-full shrink-0">
                        {entry.total_calories} kcal
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
