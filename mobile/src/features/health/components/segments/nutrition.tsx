import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Donut } from '@/components/charts/donut';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { DeletableRow } from '@/components/ui/deletable-row';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { useHealth } from '@/features/health/use-health';
import { useFoodSearch, type FoodSearchResult } from '@/features/health/use-food-search';
import { useProfile } from '@/features/profile/use-profile';
import { formatNumber } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const NutritionSegment = () => {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, addFood, deleteRecord } = useHealth();
  const { data: profileData } = useProfile();
  const search = useFoodSearch();

  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [searchMeal, setSearchMeal] = useState('lunch');

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const calories = data.food.reduce((sum, entry) => sum + (entry.total_calories ?? 0), 0);
  const protein = data.food.reduce((sum, entry) => sum + (entry.protein_g ?? 0), 0);
  const carbs = data.food.reduce((sum, entry) => sum + (entry.carbs_g ?? 0), 0);
  const fat = data.food.reduce((sum, entry) => sum + (entry.fat_g ?? 0), 0);

  const calorieTarget = profileData?.health?.daily_caloric_target ?? 2000;
  const weight = profileData?.health?.weight_kg ?? 70;
  const proteinTarget = Math.round(weight * 1.6);

  const runSearch = () => {
    if (query.trim().length >= 2) search.mutate(query.trim());
  };

  const addResult = (result: FoodSearchResult) => {
    addFood.mutate(
      {
        name: result.name,
        meal: searchMeal,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
      },
      {
        onSuccess: () => {
          setSearchVisible(false);
          setQuery('');
          search.reset();
        },
      },
    );
  };

  return (
    <>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AppText variant="headline">Calories</AppText>
          <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
            {formatNumber(calories)} / {formatNumber(calorieTarget)} kcal
          </AppText>
        </View>
        <Progress
          value={(calories / calorieTarget) * 100}
          color={calories > calorieTarget ? colors.danger : undefined}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xs }}>
          <Donut
            size={128}
            stroke={15}
            segments={[
              { key: 'protein', label: 'Protein', value: protein, color: colors.success },
              { key: 'carbs', label: 'Carbs', value: carbs, color: colors.amber },
              { key: 'fat', label: 'Fat', value: fat, color: colors.bonds },
            ]}
            centerValue={formatNumber(calories)}
            centerLabel="kcal"
          />
          <View style={{ flex: 1, gap: 8 }}>
            {[
              { label: 'Protein', value: protein, target: proteinTarget, color: colors.success },
              { label: 'Carbs', value: carbs, target: 250, color: colors.amber },
              { label: 'Fat', value: fat, target: 70, color: colors.bonds },
            ].map((macro) => (
              <View key={macro.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: macro.color }}
                />
                <AppText variant="footnote" tone="secondary" style={{ flex: 1 }}>
                  {macro.label}
                </AppText>
                <AppText variant="footnote" style={{ fontVariant: ['tabular-nums'] }}>
                  {Math.round(macro.value)}
                  <AppText variant="caption" tone="tertiary">
                    {` / ${macro.target}g`}
                  </AppText>
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Search foods"
            icon={<Icon name="food" size={16} color={colors.onPrimary} />}
            onPress={() => setSearchVisible(true)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Manual entry" variant="secondary" onPress={() => openAdd('food')} />
        </View>
      </View>

      {data.food.length === 0 ? (
        <EmptyState
          icon="food"
          title="Nothing logged today"
          message="Search the database or enter calories manually."
          actionLabel="Log a meal"
          onAction={() => openAdd('meal')}
        />
      ) : (
        MEAL_ORDER.map((meal) => {
          const entries = data.food.filter((entry) => (entry.meal_type ?? 'snack') === meal);
          if (entries.length === 0) return null;
          const mealCalories = entries.reduce((sum, entry) => sum + (entry.total_calories ?? 0), 0);
          return (
            <View key={meal} style={{ gap: space.sm }}>
              <SectionHeader
                title={meal[0].toUpperCase() + meal.slice(1)}
                caption={`${formatNumber(mealCalories)} kcal`}
              />
              <Card padded={false} style={{ paddingHorizontal: space.xl }}>
                {entries.map((entry, index) => (
                  <DeletableRow
                    key={entry.id}
                    title={entry.food_name}
                    subtitle={`${Math.round(entry.protein_g ?? 0)}P · ${Math.round(entry.carbs_g ?? 0)}C · ${Math.round(entry.fat_g ?? 0)}F`}
                    value={`${Math.round(entry.total_calories ?? 0)} kcal`}
                    last={index === entries.length - 1}
                    onDelete={() => deleteRecord.mutate({ table: 'food_entries', id: entry.id })}
                  />
                ))}
              </Card>
            </View>
          );
        })
      )}

      <Sheet
        visible={searchVisible}
        title="Search foods"
        subtitle="Nutrition per 100 g"
        onClose={() => setSearchVisible(false)}
      >
        <Chips
          label="Meal"
          options={MEAL_ORDER.map((meal) => ({ value: meal, label: meal[0].toUpperCase() + meal.slice(1) }))}
          value={searchMeal}
          onChange={setSearchMeal}
        />
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Find a food"
              value={query}
              onChangeText={setQuery}
              placeholder="chicken breast, or a barcode…"
              onSubmitEditing={runSearch}
              returnKeyType="search"
              autoFocus
            />
          </View>
          <Button label="Search" size="small" loading={search.isPending} onPress={runSearch} />
        </View>

        <AppText variant="caption" tone="tertiary">
          Search by name, or type the 8–14 digit barcode from a package.
        </AppText>

        {search.isError ? (
          <AppText variant="footnote" tone="danger">
            {search.error.message}
          </AppText>
        ) : null}

        {search.data?.length === 0 ? (
          <AppText variant="footnote" tone="secondary">
            No matches. Try a simpler term or log it manually.
          </AppText>
        ) : null}

        <FlatList
          data={search.data ?? []}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => addResult(item)}
              style={({ pressed }) => ({
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.separator,
                opacity: pressed ? 0.6 : 1,
                gap: 2,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
                <AppText variant="callout" style={{ flex: 1 }} numberOfLines={2}>
                  {item.name}
                </AppText>
                <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                  {item.calories} kcal
                </AppText>
              </View>
              <AppText variant="caption" tone="tertiary">
                {item.brand ? `${item.brand} · ` : ''}
                {item.serving}
              </AppText>
              <AppText variant="caption" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
                {`${item.protein}P · ${item.carbs}C · ${item.fat}F`}
              </AppText>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        />
        {addFood.isPending ? (
          <AppText variant="footnote" tone="secondary">
            Saving…
          </AppText>
        ) : null}
      </Sheet>
    </>
  );
};