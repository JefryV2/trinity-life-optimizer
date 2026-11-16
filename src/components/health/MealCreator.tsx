import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Save,
  X,
  UtensilsCrossed,
  Soup,
  Coffee,
  Cookie,
  AlignLeft,
  Scale,
  ChevronLeft,
} from "lucide-react";
import { FoodSearch } from "./FoodSearch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
interface USDAFood {
  fdcId: number;
  description: string;
  nutrients: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    vitaminE?: number;
    vitaminK?: number;
    thiamin?: number;
    riboflavin?: number;
    niacin?: number;
    vitaminB6?: number;
    folate?: number;
    vitaminB12?: number;
    calcium?: number;
    iron?: number;
    magnesium?: number;
    phosphorus?: number;
    potassium?: number;
    zinc?: number;
    selenium?: number;
    [key: string]: number | undefined;
  };
}
interface MealIngredient {
  id: string;
  food: USDAFood;
  amount: number;
  unit: string;
}
interface MealCreatorProps {
  onClose?: () => void;
  onMealSaved?: () => void;
}
export function MealCreator({ onClose, onMealSaved }: MealCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState("");
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [instructions, setInstructions] = useState("");
  const addIngredient = (food: USDAFood) => {
    const newIngredient: MealIngredient = {
      id: crypto.randomUUID(),
      food,
      amount: 1,
      unit: "100g",
    };
    setIngredients([...ingredients, newIngredient]);
    setShowFoodSearch(false);
  };
  const updateIngredientAmount = (id: string, amount: number) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, amount } : ing)),
    );
  };
  const updateIngredientUnit = (id: string, unit: string) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, unit } : ing)),
    );
  };
  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };
  const calculateTotalNutrients = () => {
    return ingredients.reduce(
      (totals, ingredient) => {
        const multiplier = ingredient.amount;
        Object.entries(ingredient.food.nutrients).forEach(([key, value]) => {
          if (value && typeof value === "number") {
            totals[key] = (totals[key] || 0) + value * multiplier;
          }
        });
        return totals;
      },
      {} as { [key: string]: number },
    );
  };
  const saveMeal = async () => {
    if (!user || !mealName || !mealType || ingredients.length === 0) {
      toast({
        title: "Missing information",
        description:
          "Please fill in all fields and add at least one ingredient",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      // Save each ingredient as a separate food entry
      const foodEntries = ingredients.map((ingredient) => ({
        user_id: user.id,
        food_name: `${mealName} - ${ingredient.food.description}`,
        total_calories: Math.round(
          (ingredient.food.nutrients.calories || 0) * ingredient.amount,
        ),
        protein_g:
          Math.round(
            (ingredient.food.nutrients.protein || 0) * ingredient.amount * 10,
          ) / 10,
        carbs_g:
          Math.round(
            (ingredient.food.nutrients.carbs || 0) * ingredient.amount * 10,
          ) / 10,
        fat_g:
          Math.round(
            (ingredient.food.nutrients.fat || 0) * ingredient.amount * 10,
          ) / 10,
        fiber_g:
          Math.round(
            (ingredient.food.nutrients.fiber || 0) * ingredient.amount * 10,
          ) / 10,
        sugar_g:
          Math.round(
            (ingredient.food.nutrients.sugar || 0) * ingredient.amount * 10,
          ) / 10,
        sodium_mg: Math.round(
          (ingredient.food.nutrients.sodium || 0) * ingredient.amount,
        ),
        notes: JSON.stringify({
          fdc_id: ingredient.food.fdcId,
          vitamins_minerals: {
            vitaminA:
              Math.round(
                (ingredient.food.nutrients.vitaminA || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            vitaminC:
              Math.round(
                (ingredient.food.nutrients.vitaminC || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            vitaminD:
              Math.round(
                (ingredient.food.nutrients.vitaminD || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            vitaminE:
              Math.round(
                (ingredient.food.nutrients.vitaminE || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            vitaminK:
              Math.round(
                (ingredient.food.nutrients.vitaminK || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            thiamin:
              Math.round(
                (ingredient.food.nutrients.thiamin || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            riboflavin:
              Math.round(
                (ingredient.food.nutrients.riboflavin || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            niacin:
              Math.round(
                (ingredient.food.nutrients.niacin || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            vitaminB6:
              Math.round(
                (ingredient.food.nutrients.vitaminB6 || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            folate:
              Math.round(
                (ingredient.food.nutrients.folate || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            vitaminB12:
              Math.round(
                (ingredient.food.nutrients.vitaminB12 || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
            calcium: Math.round(
              (ingredient.food.nutrients.calcium || 0) * ingredient.amount,
            ),
            iron:
              Math.round(
                (ingredient.food.nutrients.iron || 0) * ingredient.amount * 10,
              ) / 10,
            magnesium: Math.round(
              (ingredient.food.nutrients.magnesium || 0) * ingredient.amount,
            ),
            phosphorus: Math.round(
              (ingredient.food.nutrients.phosphorus || 0) * ingredient.amount,
            ),
            potassium: Math.round(
              (ingredient.food.nutrients.potassium || 0) * ingredient.amount,
            ),
            zinc:
              Math.round(
                (ingredient.food.nutrients.zinc || 0) * ingredient.amount * 10,
              ) / 10,
            selenium:
              Math.round(
                (ingredient.food.nutrients.selenium || 0) *
                  ingredient.amount *
                  10,
              ) / 10,
          },
        }),
        meal_type: mealType,
        servings: ingredient.amount,
        consumed_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("food_entries").insert(foodEntries);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("foodEntriesUpdated"));
      window.dispatchEvent(new CustomEvent("healthOverviewDataUpdated"));
      toast({
        title: "Meal saved successfully",
        description: `${mealName} has been logged to ${mealType}`,
      }); // Reset form
      setMealName("");
      setMealType("");
      setIngredients([]);
      onMealSaved?.();
    } catch (error) {
      console.error("Error saving meal:", error);
      toast({
        title: "Error saving meal",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  const totalCalories = useMemo(() => {
    const totals = calculateTotalNutrients();
    return Math.round(totals.calories || 0);
  }, [ingredients]);
  if (showFoodSearch) {
    return (
      <div className="pb-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setShowFoodSearch(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <p className="text-base font-bold text-foreground">
              Search Food Database
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#17171a]/70 overflow-hidden flex items-center justify-center text-[10px] font-black text-[#b4b4bb]">
            U
          </div>
        </div>
        <FoodSearch
          variant="add-ingredient"
          mealType={mealType}
          onMealTypeChange={setMealType}
          onFoodSelect={addIngredient}
        />
      </div>
    );
  }
  return (
    <div className="pb-8 animate-in fade-in duration-300">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => onClose?.()}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="text-center flex-1">
          <p className="text-base font-bold text-foreground">
            Create New Meal
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary font-semibold"
          onClick={saveMeal}
          disabled={
            !mealName || !mealType || ingredients.length === 0 || isSaving
          }
        >
          {isSaving ? "Saving" : "Save"}
        </Button>
      </div>
      {/* Hero image */}
      <div className="rounded-3xl overflow-hidden bg-primary from-emerald-700/40 to-stone-200/40 h-40 flex items-center justify-center relative mb-6">
        <div className="absolute left-4 bottom-4 text-[10px] font-black tracking-widest uppercase bg-primary text-primary-foreground px-3 py-1 rounded-full">
          New recipe
        </div>
        <div className="text-7xl opacity-90">🍔</div>
      </div>
      {/* Meal name */}
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb] mb-2">
          Meal Name
        </p>
        <Input
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          placeholder="e.g., Chicken Salad"
          className="h-12 rounded-full bg-[#0a0a0c]"
        />
      </div>
      {/* Meal type pills */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb] mb-3">
          Meal Type
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { id: "breakfast", label: "Breakfast", Icon: Coffee },
              { id: "lunch", label: "Lunch", Icon: UtensilsCrossed },
              { id: "dinner", label: "Dinner", Icon: Soup },
              { id: "snack", label: "Snack", Icon: Cookie },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = mealType === id;
            return (
              <button
                key={id}
                type="button"
                className={`h-12 rounded-full border px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${active ? "bg-primary/10 border-primary text-primary" : "bg-[#0a0a0c] border-[#1b1b1e] text-[#b4b4bb]"}`}
                onClick={() => setMealType(id)}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Ingredients header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xl font-black text-foreground">
            Ingredients ({ingredients.length})
          </p>
          <p className="text-xs text-[#b4b4bb]">
            {ingredients.length > 0
              ? `${totalCalories} kcal total`
              : "Add components to calculate nutrition"}
          </p>
        </div>
        <Button
          onClick={() => setShowFoodSearch(true)}
          className="h-10 rounded-full px-4 bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Ingredient
        </Button>
      </div>
      {/* Ingredients list / empty */}
      {ingredients.length === 0 ? (
        <div className="rounded-3xl bg-muted/20 p-10 text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0a0a0c] flex items-center justify-center mx-auto mb-3">
            <Scale className="h-5 w-5 text-[#b4b4bb]" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            No ingredients yet
          </p>
          <p className="text-xs text-[#b4b4bb] mt-1">
            Start by searching our database.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {ingredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="bg-card rounded-3xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {ingredient.food.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ingredient.food.nutrients.calories && (
                      <Badge variant="secondary">
                        {Math.round(
                          ingredient.food.nutrients.calories *
                            ingredient.amount,
                        )}
                        cal
                      </Badge>
                    )}
                    {ingredient.food.nutrients.protein && (
                      <Badge variant="outline">
                        P:
                        {Math.round(
                          ingredient.food.nutrients.protein *
                            ingredient.amount *
                            10,
                        ) / 10}
                        g
                      </Badge>
                    )}
                    {ingredient.food.nutrients.carbs && (
                      <Badge variant="outline">
                        C:
                        {Math.round(
                          ingredient.food.nutrients.carbs *
                            ingredient.amount *
                            10,
                        ) / 10}
                        g
                      </Badge>
                    )}
                    {ingredient.food.nutrients.fat && (
                      <Badge variant="outline">
                        F:
                        {Math.round(
                          ingredient.food.nutrients.fat *
                            ingredient.amount *
                            10,
                        ) / 10}
                        g
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-destructive"
                  onClick={() => removeIngredient(ingredient.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
                    Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={ingredient.amount}
                    onChange={(e) =>
                      updateIngredientAmount(
                        ingredient.id,
                        Number(e.target.value),
                      )
                    }
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
                    Unit
                  </Label>
                  <Select
                    value={ingredient.unit}
                    onValueChange={(value) =>
                      updateIngredientUnit(ingredient.id, value)
                    }
                  >
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100g">100g servings</SelectItem>
                      <SelectItem value="1g">Grams</SelectItem>
                      <SelectItem value="1oz">Ounces</SelectItem>
                      <SelectItem value="1cup">Cups</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Cooking instructions */}
      <div className="bg-card rounded-3xl p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb] mb-2">
          Cooking instructions (optional)
        </p>
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
            <AlignLeft className="h-4 w-4 text-[#b4b4bb]" />
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Write a short description..."
            className="w-full min-h-[88px] bg-transparent text-sm outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
