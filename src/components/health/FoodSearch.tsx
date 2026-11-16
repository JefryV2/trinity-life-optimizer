import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, ChevronDown } from "lucide-react";
import { searchFoods as searchOpenFoodFacts } from "@/lib/food-api";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
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
    calcium?: number;
    iron?: number;
    potassium?: number;
    [key: string]: number | undefined;
  };
}
interface FoodSearchProps {
  onFoodSelect: (food: USDAFood) => void;
  variant?: "default" | "add-ingredient";
  mealType?: string;
  onMealTypeChange?: (value: string) => void;
}
export function FoodSearch({
  onFoodSelect,
  variant = "default",
  mealType,
  onMealTypeChange,
}: FoodSearchProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<USDAFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchFoods = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      // Keyless Open Food Facts: name search, or a typed/scanned barcode.
      const results = await searchOpenFoodFacts(searchQuery.trim());
      setSearchResults(
        results.map((item, index) => ({
          fdcId: index,
          description: item.brand ? `${item.name} · ${item.brand}` : item.name,
          dataType: item.serving,
          nutrients: {
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          },
        })),
      );
      if (results.length === 0) {
        toast({
          title: "No matches",
          description: "Try a simpler term, or type the barcode from the package.",
        });
      }
    } catch (error: unknown) {
      console.error("Error searching foods:", error);
      setSearchResults([]);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchFoods();
    }
  };
  const resultCountLabel = useMemo(() => {
    const n = searchResults.length;
    return `${n} result${n === 1 ? "" : "s"}`;
  }, [searchResults.length]);
  return (
    <div className={variant === "add-ingredient" ? "space-y-4" : "space-y-4"}>
      {variant === "add-ingredient" ? (
        <>
          {/* Meal type dropdown pill */}
          <div className="bg-[#0a0a0c] rounded-3xl px-4 py-3">
            <Select
              value={mealType || ""}
              onValueChange={(v) => onMealTypeChange?.(v)}
            >
              <SelectTrigger className="border-0 p-0 h-auto bg-transparent shadow-none focus:ring-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="text-lg">🍴</span>
                    <SelectValue placeholder="Meal" />
                  </div>
                  <ChevronDown className="h-4 w-4 text-[#b4b4bb]" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Search pill */}
          <div className="bg-[#0a0a0c] rounded-full px-4 py-3 flex items-center gap-2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#b4b4bb]" />
            ) : (
              <Search className="h-4 w-4 text-[#b4b4bb]" />
            )}
            <Input
              placeholder="Search thousands of foods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="border-0 p-0 h-auto bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={searchFoods}
              disabled={isSearching || !searchQuery.trim()}
              className="h-8 px-3 rounded-full"
            >
              Search
            </Button>
          </div>
          {/* Results */}
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-black text-foreground">
                Recent &amp; Suggestions
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#b4b4bb]">
                {hasSearched ? resultCountLabel : ""}
              </p>
            </div>
            {hasSearched ? (
              searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((food, idx) => (
                    <div key={food.fdcId} className="space-y-3">
                      <div className="bg-[#0a0a0c] rounded-3xl p-4 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">
                            {food.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {food.nutrients.calories != null && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#101012] text-[#b4b4bb]">
                                {Math.round(food.nutrients.calories)} kcal
                              </span>
                            )}
                            {food.nutrients.protein != null && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#101012] text-[#b4b4bb]">
                                P: {Math.round(food.nutrients.protein)}g
                              </span>
                            )}
                            {food.nutrients.carbs != null && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#101012] text-[#b4b4bb]">
                                C: {Math.round(food.nutrients.carbs)}g
                              </span>
                            )}
                            {food.nutrients.fat != null && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#101012] text-[#b4b4bb]">
                                F: {Math.round(food.nutrients.fat)}g
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-[0_10px_18px_rgba(255,92,66,0.35)] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                          onClick={() => onFoodSelect(food)}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      {/* Fun fact card (insert once, like screenshot) */}
                      {idx === 0 && (
                        <div className="rounded-3xl bg-[#17171a] text-[#b4b4bb] p-5 relative overflow-hidden">
                          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#101012]" />
                          <p className="text-sm font-black mb-2">
                            Did you know?
                          </p>
                          <p className="text-xs leading-relaxed font-medium">
                            Many fruits contain pectin, a type of fiber that
                            acts as a prebiotic, feeding the friendly bacteria
                            in your gut.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No foods found. Try a different search term.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Search to see suggestions.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Search for foods (e.g., chicken breast, apple)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={searchFoods}
              disabled={isSearching || !searchQuery.trim()}
              className="px-4"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {/* Search Results */}
          {hasSearched && (
            <div className="space-y-3">
              {searchResults.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Found {searchResults.length} foods
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {searchResults.map((food) => (
                      <Card
                        key={food.fdcId}
                        className="p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-5 line-clamp-2">
                              {food.description}
                            </h4>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {food.nutrients.calories && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(food.nutrients.calories)} cal
                                </Badge>
                              )}
                              {food.nutrients.protein && (
                                <Badge variant="outline" className="text-xs">
                                  P: {Math.round(food.nutrients.protein)}g
                                </Badge>
                              )}
                              {food.nutrients.carbs && (
                                <Badge variant="outline" className="text-xs">
                                  C: {Math.round(food.nutrients.carbs)}g
                                </Badge>
                              )}
                              {food.nutrients.fat && (
                                <Badge variant="outline" className="text-xs">
                                  F: {Math.round(food.nutrients.fat)}g
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onFoodSelect(food)}
                            className="flex-shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No foods found. Try a different search term.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
