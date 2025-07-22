import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface USDAFood {
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
}

export function FoodSearch({ onFoodSelect }: FoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<USDAFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchFoods = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-food', {
        body: { query: searchQuery, pageSize: 20 }
      });

      if (error) throw error;

      setSearchResults(data.foods || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching foods:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchFoods();
    }
  };

  return (
    <div className="space-y-4">
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
                  <Card key={food.fdcId} className="p-3 hover:bg-muted/50 transition-colors">
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
    </div>
  );
}