
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChefHat, Scale, Save } from 'lucide-react';
import { FoodSearch } from './FoodSearch';
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
  onMealSaved?: () => void;
}

export function MealCreator({ onMealSaved }: MealCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('');
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addIngredient = (food: USDAFood) => {
    const newIngredient: MealIngredient = {
      id: crypto.randomUUID(),
      food,
      amount: 1,
      unit: '100g'
    };
    setIngredients([...ingredients, newIngredient]);
    setShowFoodSearch(false);
  };

  const updateIngredientAmount = (id: string, amount: number) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, amount } : ing
    ));
  };

  const updateIngredientUnit = (id: string, unit: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, unit } : ing
    ));
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const calculateTotalNutrients = () => {
    return ingredients.reduce((totals, ingredient) => {
      const multiplier = ingredient.amount;
      Object.entries(ingredient.food.nutrients).forEach(([key, value]) => {
        if (value && typeof value === 'number') {
          totals[key] = (totals[key] || 0) + (value * multiplier);
        }
      });
      return totals;
    }, {} as { [key: string]: number });
  };

  const saveMeal = async () => {
    if (!user || !mealName || !mealType || ingredients.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and add at least one ingredient",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {

      // Save each ingredient as a separate food entry
      const foodEntries = ingredients.map(ingredient => ({
        user_id: user.id,
        food_name: `${mealName} - ${ingredient.food.description}`,
        total_calories: Math.round((ingredient.food.nutrients.calories || 0) * ingredient.amount),
        protein_g: Math.round((ingredient.food.nutrients.protein || 0) * ingredient.amount * 10) / 10,
        carbs_g: Math.round((ingredient.food.nutrients.carbs || 0) * ingredient.amount * 10) / 10,
        fat_g: Math.round((ingredient.food.nutrients.fat || 0) * ingredient.amount * 10) / 10,
        fiber_g: Math.round((ingredient.food.nutrients.fiber || 0) * ingredient.amount * 10) / 10,
        sugar_g: Math.round((ingredient.food.nutrients.sugar || 0) * ingredient.amount * 10) / 10,
        sodium_mg: Math.round((ingredient.food.nutrients.sodium || 0) * ingredient.amount),
        notes: JSON.stringify({
          vitamins_minerals: {
            vitaminA: Math.round((ingredient.food.nutrients.vitaminA || 0) * ingredient.amount * 10) / 10,
            vitaminC: Math.round((ingredient.food.nutrients.vitaminC || 0) * ingredient.amount * 10) / 10,
            vitaminD: Math.round((ingredient.food.nutrients.vitaminD || 0) * ingredient.amount * 10) / 10,
            vitaminE: Math.round((ingredient.food.nutrients.vitaminE || 0) * ingredient.amount * 10) / 10,
            vitaminK: Math.round((ingredient.food.nutrients.vitaminK || 0) * ingredient.amount * 10) / 10,
            thiamin: Math.round((ingredient.food.nutrients.thiamin || 0) * ingredient.amount * 10) / 10,
            riboflavin: Math.round((ingredient.food.nutrients.riboflavin || 0) * ingredient.amount * 10) / 10,
            niacin: Math.round((ingredient.food.nutrients.niacin || 0) * ingredient.amount * 10) / 10,
            vitaminB6: Math.round((ingredient.food.nutrients.vitaminB6 || 0) * ingredient.amount * 10) / 10,
            folate: Math.round((ingredient.food.nutrients.folate || 0) * ingredient.amount * 10) / 10,
            vitaminB12: Math.round((ingredient.food.nutrients.vitaminB12 || 0) * ingredient.amount * 10) / 10,
            calcium: Math.round((ingredient.food.nutrients.calcium || 0) * ingredient.amount),
            iron: Math.round((ingredient.food.nutrients.iron || 0) * ingredient.amount * 10) / 10,
            magnesium: Math.round((ingredient.food.nutrients.magnesium || 0) * ingredient.amount),
            phosphorus: Math.round((ingredient.food.nutrients.phosphorus || 0) * ingredient.amount),
            potassium: Math.round((ingredient.food.nutrients.potassium || 0) * ingredient.amount),
            zinc: Math.round((ingredient.food.nutrients.zinc || 0) * ingredient.amount * 10) / 10,
            selenium: Math.round((ingredient.food.nutrients.selenium || 0) * ingredient.amount * 10) / 10
          }
        }),
        meal_type: mealType,
        servings: ingredient.amount,
        consumed_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('food_entries')
        .insert(foodEntries);

      if (error) throw error;

      toast({
        title: "Meal saved successfully",
        description: `${mealName} has been logged to ${mealType}`
      });

      // Reset form
      setMealName('');
      setMealType('');
      setIngredients([]);
      onMealSaved?.();
    } catch (error) {
      console.error('Error saving meal:', error);
      toast({
        title: "Error saving meal",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalNutrients = calculateTotalNutrients();

  if (showFoodSearch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Ingredient
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => setShowFoodSearch(false)}
            className="w-fit"
          >
            Back to Meal
          </Button>
        </CardHeader>
        <CardContent>
          <FoodSearch onFoodSelect={addIngredient} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Meal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Create New Meal
          </CardTitle>
          <CardDescription>
            Build a complete meal with multiple ingredients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meal Name</Label>
              <Input
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="e.g., Chicken Salad Bowl"
              />
            </div>
            <div className="space-y-2">
              <Label>Meal Type</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meal" />
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
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredients ({ingredients.length})</CardTitle>
          <Button
            onClick={() => setShowFoodSearch(true)}
            className="w-fit"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Ingredient
          </Button>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No ingredients added yet. Click "Add Ingredient" to start building your meal.
            </p>
          ) : (
            <div className="space-y-4">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{ingredient.food.description}</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {ingredient.food.nutrients.calories && (
                          <Badge variant="secondary">
                            {Math.round(ingredient.food.nutrients.calories * ingredient.amount)} cal
                          </Badge>
                        )}
                        {ingredient.food.nutrients.protein && (
                          <Badge variant="outline">
                            P: {Math.round(ingredient.food.nutrients.protein * ingredient.amount * 10) / 10}g
                          </Badge>
                        )}
                        {ingredient.food.nutrients.carbs && (
                          <Badge variant="outline">
                            C: {Math.round(ingredient.food.nutrients.carbs * ingredient.amount * 10) / 10}g
                          </Badge>
                        )}
                        {ingredient.food.nutrients.fat && (
                          <Badge variant="outline">
                            F: {Math.round(ingredient.food.nutrients.fat * ingredient.amount * 10) / 10}g
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIngredient(ingredient.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={ingredient.amount}
                        onChange={(e) => updateIngredientAmount(ingredient.id, Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Select value={ingredient.unit} onValueChange={(value) => updateIngredientUnit(ingredient.id, value)}>
                        <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Meal Totals */}
      {ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meal Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(totalNutrients.calories || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {Math.round((totalNutrients.protein || 0) * 10) / 10}g
                </div>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {Math.round((totalNutrients.carbs || 0) * 10) / 10}g
                </div>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {Math.round((totalNutrients.fat || 0) * 10) / 10}g
                </div>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>

            {/* Vitamins & Minerals */}
            <Separator className="my-4" />
            <h4 className="font-medium mb-3">Vitamins & Minerals</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                { key: 'vitaminA', label: 'Vitamin A', unit: 'μg' },
                { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
                { key: 'vitaminD', label: 'Vitamin D', unit: 'μg' },
                { key: 'vitaminE', label: 'Vitamin E', unit: 'mg' },
                { key: 'vitaminK', label: 'Vitamin K', unit: 'μg' },
                { key: 'thiamin', label: 'Thiamin (B1)', unit: 'mg' },
                { key: 'riboflavin', label: 'Riboflavin (B2)', unit: 'mg' },
                { key: 'niacin', label: 'Niacin (B3)', unit: 'mg' },
                { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg' },
                { key: 'folate', label: 'Folate', unit: 'μg' },
                { key: 'vitaminB12', label: 'Vitamin B12', unit: 'μg' },
                { key: 'calcium', label: 'Calcium', unit: 'mg' },
                { key: 'iron', label: 'Iron', unit: 'mg' },
                { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
                { key: 'phosphorus', label: 'Phosphorus', unit: 'mg' },
                { key: 'potassium', label: 'Potassium', unit: 'mg' },
                { key: 'zinc', label: 'Zinc', unit: 'mg' },
                { key: 'selenium', label: 'Selenium', unit: 'μg' }
              ].map((nutrient) => {
                const value = totalNutrients[nutrient.key];
                if (!value || value < 0.1) return null;
                return (
                  <div key={nutrient.key} className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">{nutrient.label}</span>
                    <span className="font-medium">
                      {Math.round(value * 10) / 10}{nutrient.unit}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button 
              onClick={saveMeal}
              disabled={!mealName || !mealType || ingredients.length === 0 || isSaving}
              className="w-full mt-6"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving Meal...' : 'Save Meal'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
