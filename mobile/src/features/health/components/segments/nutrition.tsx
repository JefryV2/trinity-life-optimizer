import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Donut } from '@/components/charts/donut';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Progress } from '@/components/ui/progress';
import { Panel } from '@/components/ui/panel';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { toast } from '@/components/ui/toast';
import { MicronutrientPanel } from '@/features/health/components/micronutrients';
import { useHealth } from '@/features/health/use-health';
import { useFoodSearch, type FoodSearchResult } from '@/features/health/use-food-search';
import { useProfile } from '@/features/profile/use-profile';
import { formatNumber } from '@/lib/format';
import { confirmDelete } from '@/lib/confirm';
import { openAdd, openEdit } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const NutritionSegment = () => {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, addFood, deleteRecord } = useHealth();
  const { data: profileData } = useProfile();
  const search = useFoodSearch();

  const [logMenuVisible, setLogMenuVisible] = useState(false);
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
  const fiber = data.food.reduce((sum, entry) => sum + (entry.fiber_g ?? 0), 0);
  const sugar = data.food.reduce((sum, entry) => sum + (entry.sugar_g ?? 0), 0);
  const sodium = data.food.reduce((sum, entry) => sum + (entry.sodium_mg ?? 0), 0);

  const calorieTarget = profileData?.health?.daily_caloric_target ?? 2000;
  const weight = profileData?.health?.weight_kg ?? 70;
  const proteinTarget = Math.round(weight * 1.6);
  // One accent, then neutral steps: macros are not pillars, so they must not
  // borrow Wealth amber or People blue.
  const macroRows = [
    { label: 'Protein', value: protein, target: proteinTarget, color: colors.primary },
    { label: 'Carbs', value: carbs, target: 250, color: colors.textSecondary },
    { label: 'Fat', value: fat, target: 70, color: colors.textFaint },
  ];
  const calorieLeft = calorieTarget - calories;

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
        fiber: result.fiber,
        sugar: result.sugar,
        sodium: result.sodium,
        micros: result.micros,
      },
      {
        onSuccess: () => {
          toast.show('Food added');
          setSearchVisible(false);
          setQuery('');
          search.reset();
        },
      },
    );
  };

  return (
    <>
      {data.food.length === 0 ? (
        <EmptyState
          icon="food"
          title="Nothing logged today"
          message={`Target ${formatNumber(calorieTarget)} kcal. Search the database, scan a barcode, or build a meal.`}
          actionLabel="Log food"
          onAction={() => setLogMenuVisible(true)}
        />
      ) : (
        <>
          <Panel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Donut
                size={128}
                stroke={14}
                max={calorieTarget}
                rounded
                segments={[
                  { key: 'calories', label: 'Calories', value: calories, color: colors.primary },
                ]}
                centerValue={formatNumber(calories)}
                centerLabel={`of ${formatNumber(calorieTarget)}`}
              />
              <View style={{ flex: 1, gap: space.md }}>
                {macroRows.map((macro) => (
                  <View key={macro.label} style={{ gap: 5 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 6,
                      }}
                    >
                      <AppText variant="footnote" tone="secondary">
                        {macro.label}
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                        <AppText
                          variant="callout"
                          style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}
                        >
                          {Math.round(macro.value)}
                        </AppText>
                        <AppText variant="footnote" tone="tertiary">
                          / {macro.target}g
                        </AppText>
                      </View>
                    </View>
                    <Progress
                      value={(macro.value / Math.max(1, macro.target)) * 100}
                      height={4}
                      color={macro.color}
                    />
                  </View>
                ))}
              </View>
            </View>
          </Panel>

          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
          >
            <AppText variant="footnote" tone="secondary">
              {calorieLeft >= 0
                ? `${formatNumber(calorieLeft)} kcal left today`
                : `${formatNumber(Math.abs(calorieLeft))} kcal over today`}
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              Target {formatNumber(calorieTarget)} kcal
            </AppText>
          </View>

          <Button label="Log food" onPress={() => setLogMenuVisible(true)} />

          <View style={{ gap: space.md }}>
            {MEAL_ORDER.map((meal) => {
              const entries = data.food.filter((entry) => (entry.meal_type ?? 'snack') === meal);
              if (entries.length === 0) return null;
              return entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityHint="Tap to edit, long press to delete"
                  onPress={() => openEdit('food', entry.id)}
                  onLongPress={() =>
                    confirmDelete(entry.food_name, () =>
                      deleteRecord.mutate({ table: 'food_entries', id: entry.id }),
                    )
                  }
                  delayLongPress={350}
                  style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
                >
                  <Panel style={{ gap: space.xs }}>
                    <AppText variant="caption" tone="tertiary">
                      {meal}
                    </AppText>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: space.md,
                      }}
                    >
                      <AppText variant="headline" numberOfLines={1} style={{ flex: 1 }}>
                        {entry.food_name}
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                        <AppText
                          variant="numeric"
                          style={{ fontSize: 24, lineHeight: 28, letterSpacing: -1 }}
                        >
                          {Math.round(entry.total_calories ?? 0)}
                        </AppText>
                        <AppText variant="footnote" tone="secondary">
                          kcal
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="footnote" tone="tertiary">
                      {`${Math.round(entry.protein_g ?? 0)}P · ${Math.round(entry.carbs_g ?? 0)}C · ${Math.round(entry.fat_g ?? 0)}F`}
                    </AppText>
                  </Panel>
                </Pressable>
              ));
            })}
          </View>

          <MicronutrientPanel entries={data.food} profile={profileData?.health ?? null} />
        </>
      )}

      <Sheet
        compact
        visible={logMenuVisible}
        title="Log food"
        subtitle="Choose how you want to add it"
        onClose={() => setLogMenuVisible(false)}
      >
        <View style={{ gap: space.sm }}>
          <Button
            label="Search the food database"
            onPress={() => {
              setLogMenuVisible(false);
              setSearchVisible(true);
            }}
          />
          <Button
            label="Scan a barcode"
            variant="secondary"
            onPress={() => {
              setLogMenuVisible(false);
              router.push('/scan-food' as never);
            }}
          />
          <Button
            label="Build a meal from components"
            variant="secondary"
            onPress={() => {
              setLogMenuVisible(false);
              router.push('/meal-builder' as never);
            }}
          />
          <Button
            label="Enter it manually"
            variant="secondary"
            onPress={() => {
              setLogMenuVisible(false);
              openAdd('food');
            }}
          />
        </View>
      </Sheet>

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

        <Button
          label="Scan a barcode"
          variant="secondary"
          size="small"
          onPress={() => {
            setSearchVisible(false);
            router.push('/scan-food' as never);
          }}
        />
        <AppText variant="caption" tone="tertiary">
          Search by name, type the 8–14 digit barcode, or scan the package.
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