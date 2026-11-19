import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { toast } from '@/components/ui/toast';
import { useFoodSearch, type FoodSearchResult } from '@/features/health/use-food-search';
import { useHealth } from '@/features/health/use-health';
import { useRecentFoods, type RecentFood } from '@/features/health/use-recent-foods';
import { radius, space, useTheme } from '@/theme';

type Filter = 'recent' | 'favorites' | 'meals' | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'recent', label: 'Recent' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'meals', label: 'Meals' },
  { value: 'all', label: 'All' },
];

const mealForNow = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
};

const mealLabel = (meal: string | null) => {
  if (!meal) return 'Food';
  return meal.charAt(0).toUpperCase() + meal.slice(1);
};

const uniqueRecent = (entries: RecentFood[]) => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.food_name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ResultRow = ({
  name,
  detail,
  calories,
  onAdd,
  last,
}: {
  name: string;
  detail: string;
  calories: number;
  onAdd: () => void;
  last: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.separator,
      }}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="headline" numberOfLines={2}>
          {name}
        </AppText>
        <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
          {Math.round(calories)}
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          kcal
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${name}`}
        onPress={onAdd}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Icon name="plus" size={23} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
};

export default function FoodSearchScreen() {
  const { colors } = useTheme();
  const { addFood } = useHealth();
  const recentFoods = useRecentFoods();
  const { mutate: runSearch, reset: resetSearch, ...search } = useFoodSearch();
  const [filter, setFilter] = useState<Filter>('recent');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      resetSearch();
      return;
    }
    const timer = setTimeout(() => {
      runSearch(needle);
    }, 380);
    return () => clearTimeout(timer);
  }, [query, resetSearch, runSearch]);

  const addResult = (result: FoodSearchResult) => {
    addFood.mutate(
      {
        name: result.name,
        meal: mealForNow(),
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber,
        sugar: result.sugar,
        sodium: result.sodium,
        micros: result.micros,
      },
      {
        onSuccess: () => toast.show('Food added'),
        onError: (caught) => toast.show(caught.message),
      },
    );
  };

  const addRecent = (entry: RecentFood) => {
    addFood.mutate(
      {
        name: entry.food_name,
        meal: mealForNow(),
        calories: Math.round(entry.total_calories ?? 0),
        protein: Number(entry.protein_g ?? 0),
        carbs: Number(entry.carbs_g ?? 0),
        fat: Number(entry.fat_g ?? 0),
        fiber: Number(entry.fiber_g ?? 0),
        sugar: Number(entry.sugar_g ?? 0),
        sodium: Number(entry.sodium_mg ?? 0),
        micros: entry.micronutrients ?? undefined,
      },
      {
        onSuccess: () => toast.show('Food added'),
        onError: (caught) => toast.show(caught.message),
      },
    );
  };

  const recent = uniqueRecent(recentFoods.data ?? []);
  const meals = recent.filter(
    (entry) => Array.isArray(entry.components) && entry.components.length > 0,
  );
  const searching = search.isPending;
  const searchResults = search.data ?? [];

  const rows =
    filter === 'recent'
      ? recent
      : filter === 'meals'
        ? meals
        : filter === 'all' && query.trim().length >= 2
          ? searchResults
          : [];

  const emptyMessage =
    filter === 'favorites'
      ? 'No favourites yet. Add foods a few times and they will collect here.'
      : filter === 'all'
        ? 'Search by name, brand, or type a barcode.'
        : filter === 'meals'
          ? 'No meals saved yet. Build one from components.'
          : 'Nothing logged yet. Search the database to start.';

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.xl, paddingBottom: space.xxl, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">Add food</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan a barcode"
          onPress={() => router.replace('/scan-food' as never)}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="barcode" size={21} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ gap: space.xs }}>
        <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
          {filter === 'all' && query.trim().length >= 2 ? 'RESULTS' : filter.toUpperCase()}
        </AppText>
        {rows.length === 0 ? (
          <AppText variant="callout" tone="secondary" style={{ paddingVertical: space.lg }}>
            {searching ? 'Searching…' : emptyMessage}
          </AppText>
        ) : (
          <View>
            {rows.map((row, index) => {
              const isSearch = 'serving' in row;
              const item = row as FoodSearchResult | RecentFood;
              if (isSearch) {
                const result = item as FoodSearchResult;
                return (
                  <ResultRow
                    key={`${result.name}-${index}`}
                    name={result.name}
                    detail={`${result.serving}${result.brand ? ` · ${result.brand}` : ''}`}
                    calories={result.calories}
                    onAdd={() => addResult(result)}
                    last={index === rows.length - 1}
                  />
                );
              }
              const entry = item as RecentFood;
              return (
                <ResultRow
                  key={`${entry.food_name}-${index}`}
                  name={entry.food_name}
                  detail={`${mealLabel(entry.meal_type)} · recent`}
                  calories={entry.total_calories ?? 0}
                  onAdd={() => addRecent(entry)}
                  last={index === rows.length - 1}
                />
              );
            })}
          </View>
        )}
        {search.isError ? (
          <AppText variant="footnote" tone="danger">
            {search.error.message}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {FILTERS.map((option) => {
            const selected = filter === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setFilter(option.value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  borderRadius: radius.pill,
                  borderWidth: selected ? 0 : 1,
                  borderColor: colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText
                  variant="callout"
                  style={{
                    color: selected ? colors.onPrimary : colors.text,
                    fontWeight: '700',
                  }}
                  numberOfLines={1}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View
          style={{
            minHeight: 58,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space.lg,
            gap: space.sm,
          }}
        >
          <Icon name="search" size={20} color={colors.primary} />
          <TextInput
            accessibilityLabel="Search foods"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (text.trim().length >= 2) setFilter('all');
            }}
            placeholder="Search foods"
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            autoCorrect={false}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 18,
              paddingVertical: space.sm,
            }}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 'auto', paddingTop: space.xl }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
