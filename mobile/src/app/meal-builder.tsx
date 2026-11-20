import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Switch, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DetailHeader } from '@/components/ui/detail-header';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Stat, StatRow } from '@/components/ui/stat';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { toast } from '@/components/ui/toast';
import { useFoodSearch, type FoodSearchResult } from '@/features/health/use-food-search';
import { takePendingMealComponent } from '@/features/health/pending-component';
import { useHealth } from '@/features/health/use-health';
import { useRecentFoods } from '@/features/health/use-recent-foods';
import { useProfile } from '@/features/profile/use-profile';
import { formatNumber, isoDate, formatStamp } from '@/lib/format';
import {
  dailyNeeds,
  formatNutrientValue,
  type Micronutrients,
} from '@/lib/nutrition';
import { fonts, radius, space, useTheme } from '@/theme';

const MEALS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

type Per100 = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  micros?: Micronutrients;
};

type Portion = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
};

type Component = {
  id: string;
  name: string;
  grams: number;
  per100: Per100 | null;
  portion: Portion | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const componentTotals = (component: Component) => {
  const factor = component.per100 ? component.grams / 100 : 1;
  const source = component.per100 ?? component.portion;
  const micros: Micronutrients = {};
  if (source && 'micros' in source && source.micros) {
    for (const [key, value] of Object.entries(source.micros)) {
      micros[key as keyof Micronutrients] =
        Math.round(Number(value) * factor * 100) / 100;
    }
  }
  return {
    calories: Math.round((source?.calories ?? 0) * factor),
    protein: round1((source?.protein ?? 0) * factor),
    carbs: round1((source?.carbs ?? 0) * factor),
    fat: round1((source?.fat ?? 0) * factor),
    fiber: round1((source?.fiber ?? 0) * factor),
    sugar: round1((source?.sugar ?? 0) * factor),
    sodium: Math.round((source?.sodium ?? 0) * factor),
    micros,
  };
};

const mergeMicros = (components: Component[]): Micronutrients => {
  const total: Micronutrients = {};
  for (const component of components) {
    const { micros } = componentTotals(component);
    for (const [key, value] of Object.entries(micros)) {
      const nutrient = key as keyof Micronutrients;
      total[nutrient] = Math.round(((total[nutrient] ?? 0) + Number(value)) * 100) / 100;
    }
  }
  return total;
};

export default function MealBuilderScreen() {
  const { colors } = useTheme();
  const { addFood } = useHealth();
  const { data: profileData } = useProfile();
  const recentFoods = useRecentFoods();
  const search = useFoodSearch();
  const nextId = useRef(0);

  const [components, setComponents] = useState<Component[]>([]);
  const [name, setName] = useState('');
  const [meal, setMeal] = useState('lunch');
  const [date, setDate] = useState(new Date());
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [manualVisible, setManualVisible] = useState(false);
  const [manual, setManual] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const addId = () => {
    nextId.current += 1;
    return `component-${Date.now()}-${nextId.current}`;
  };

  useFocusEffect(
    useCallback(() => {
      const pending = takePendingMealComponent();
      if (!pending) return;
      setComponents((current) => [
        ...current,
        {
          id: addId(),
          name: pending.name,
          grams: pending.grams,
          per100: pending.per100,
          portion: null,
        },
      ]);
    }, []),
  );

  const addSearchResult = (result: FoodSearchResult) => {
    setComponents((current) => [
      ...current,
      {
        id: addId(),
        name: result.brand ? `${result.name} (${result.brand})` : result.name,
        grams: 100,
        per100: {
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          fiber: result.fiber,
          sugar: result.sugar,
          sodium: result.sodium,
          micros: result.micros,
        },
        portion: null,
      },
    ]);
    setSearchVisible(false);
    setQuery('');
    search.reset();
  };

  const addManual = () => {
    const calories = Number(manual.calories.replace(',', '.'));
    const protein = Number(manual.protein.replace(',', '.'));
    const carbs = Number(manual.carbs.replace(',', '.'));
    const fat = Number(manual.fat.replace(',', '.'));
    if (!manual.name.trim()) {
      setError('Name the component.');
      return;
    }
    if (!Number.isFinite(calories) || calories < 0) {
      setError('Enter the component calories.');
      return;
    }
    setComponents((current) => [
      ...current,
      {
        id: addId(),
        name: manual.name.trim(),
        grams: 0,
        per100: null,
        portion: {
          calories,
          protein: Number.isFinite(protein) ? protein : 0,
          carbs: Number.isFinite(carbs) ? carbs : 0,
          fat: Number.isFinite(fat) ? fat : 0,
        },
      },
    ]);
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setManualVisible(false);
    setError(null);
  };

  const totals = components.reduce(
    (sum, component) => {
      const value = componentTotals(component);
      return {
        calories: sum.calories + value.calories,
        protein: sum.protein + value.protein,
        carbs: sum.carbs + value.carbs,
        fat: sum.fat + value.fat,
        fiber: sum.fiber + value.fiber,
        sugar: sum.sugar + value.sugar,
        sodium: sum.sodium + value.sodium,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  );

  const micros = mergeMicros(components);
  const needs = dailyNeeds(profileData?.health ?? null);
  const calorieTarget = profileData?.health?.daily_caloric_target ?? 2000;
  const weight = profileData?.health?.weight_kg ?? 70;
  const proteinTarget = Math.round(weight * 1.6);
  const hasMicros = Object.values(micros).some((value) => Number(value) > 0);
  const recentMeals = (recentFoods.data ?? [])
    .filter((entry) => Array.isArray(entry.components) && entry.components.length > 0)
    .slice(0, 4);

  const repeatMeal = (entry: (typeof recentMeals)[number]) => {
    const raw = Array.isArray(entry.components) ? entry.components : [];
    const loaded: Component[] = raw.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const value = item as Partial<Component>;
      if (typeof value.name !== 'string') return [];
      return [
        {
          id: addId(),
          name: value.name,
          grams: Number(value.grams ?? 0),
          per100: value.per100 ?? null,
          portion: value.portion ?? null,
        },
      ];
    });
    if (loaded.length === 0) return;
    setComponents(loaded);
    setName(entry.food_name);
    setMeal(entry.meal_type ?? 'lunch');
  };

  const save = async () => {
    if (components.length === 0) {
      setError('Add at least one component.');
      return;
    }
    setSaving(true);
    setError(null);
    const fallbackName = components
      .map((component) => component.name)
      .slice(0, 3)
      .join(' + ');
    try {
      await addFood.mutateAsync({
        name: name.trim() || fallbackName,
        meal,
        calories: Math.round(totals.calories),
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber,
        sugar: totals.sugar,
        sodium: totals.sodium,
        micros: hasMicros ? micros : undefined,
        components: components.map(({ name: componentName, grams, per100, portion }) => ({
          name: componentName,
          grams,
          per100,
          portion,
        })),
        notes: `${saveAsTemplate ? 'Template. ' : ''}Built from: ${components
          .map((component) =>
            component.per100
              ? `${component.name} ${component.grams} g`
              : `${component.name} 1 portion`,
          )
          .join(' · ')}`.slice(0, 300),
        occurredAt: date.toISOString(),
      });
      toast.show('Meal saved');
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the meal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl, flexGrow: 1 }}>
      <View
        style={{
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginTop: -space.md,
        }}
      />
      <DetailHeader title="Build a meal" fallback="/(tabs)/health" />

      <TextInput
        accessibilityLabel="Meal name"
        value={name}
        onChangeText={setName}
        placeholder="Name this meal"
        placeholderTextColor={colors.textFaint}
        maxLength={100}
        style={{
          minHeight: 58,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: space.lg,
          color: colors.text,
          fontFamily: fonts.medium,
          fontSize: 20,
          letterSpacing: -0.3,
        }}
      />

      {components.length > 0 ? (
        <View>
          {components.map((component, index) => {
            const value = componentTotals(component);
            return (
              <View
                key={component.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.md,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.separator,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add another component before ${component.name}`}
                  onPress={() => setSearchVisible(true)}
                  style={({ pressed }) => ({
                    width: 46,
                    height: 46,
                    borderRadius: radius.pill,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Icon name="plus" size={21} color={colors.primary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Long press to remove"
                  onPress={() => setSearchVisible(true)}
                  onLongPress={() =>
                    setComponents((current) => current.filter((item) => item.id !== component.id))
                  }
                  delayLongPress={400}
                  style={{ flex: 1, gap: 1 }}
                >
                  <AppText variant="headline" numberOfLines={1}>
                    {component.name}
                  </AppText>
                  <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
                    {component.per100
                      ? `${component.grams} g · ${value.calories} kcal`
                      : `1 portion · ${value.calories} kcal`}
                  </AppText>
                </Pressable>
                {component.per100 ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${component.name}`}
                      onPress={() =>
                        setComponents((current) =>
                          current.map((item) =>
                            item.id === component.id
                              ? { ...item, grams: Math.max(0, item.grams - 10) }
                              : item,
                          ),
                        )
                      }
                      style={({ pressed }) => ({
                        width: 44,
                        height: 44,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.55 : 1,
                      })}
                    >
                      <AppText variant="headline" tone="secondary" style={{ fontSize: 23 }}>
                        −
                      </AppText>
                    </Pressable>
                    <View style={{ width: 58, alignItems: 'center' }}>
                      <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                        {component.grams} g
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${component.name}`}
                      onPress={() =>
                        setComponents((current) =>
                          current.map((item) =>
                            item.id === component.id ? { ...item, grams: item.grams + 10 } : item,
                          ),
                        )
                      }
                      style={({ pressed }) => ({
                        width: 44,
                        height: 44,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.55 : 1,
                      })}
                    >
                      <Icon name="plus" size={20} color={colors.text} />
                    </Pressable>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View>
          {[0, 1, 2].map((index) => (
            <View
              key={`placeholder-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.separator,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a component"
                onPress={() => setSearchVisible(true)}
                style={({ pressed }) => ({
                  width: 46,
                  height: 46,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Icon name="plus" size={21} color={colors.primary} />
              </Pressable>
              <View style={{ flex: 1, gap: 1 }}>
                <AppText variant="headline" tone="secondary">
                  Component
                </AppText>
                <AppText variant="footnote" tone="faint">
                  0 g · 0 kcal
                </AppText>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.separator,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="headline" tone="faint" style={{ fontSize: 23 }}>
                  −
                </AppText>
              </View>
              <AppText variant="headline" tone="faint" style={{ width: 58, textAlign: 'center' }}>
                0 g
              </AppText>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.separator,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="plus" size={20} color={colors.textFaint} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add component"
        onPress={() => setSearchVisible(true)}
        style={({ pressed }) => ({
          minHeight: 62,
          borderRadius: radius.inner,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Icon name="plus" size={20} color={colors.primary} />
        <AppText variant="headline" tone="primary">
          Add component
        </AppText>
      </Pressable>

      <Panel style={{ gap: space.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: space.md,
          }}
        >
          <AppText variant="headline" tone="secondary">
            Meal total
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <AppText
              variant="display"
              style={{ fontSize: 46, lineHeight: 50, letterSpacing: -2.5 }}
            >
              {Math.round(totals.calories)}
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              kcal
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {[
            { label: 'Protein', value: totals.protein, color: colors.primary },
            { label: 'Carbs', value: totals.carbs, color: colors.bonds },
            { label: 'Fat', value: totals.fat, color: colors.wealth },
          ].map((macro) => (
            <View
              key={macro.label}
              style={{
                flex: 1,
                backgroundColor: colors.surfaceSunken,
                borderRadius: radius.inner,
                padding: space.md,
                gap: 1,
              }}
            >
              <AppText variant="callout" style={{ color: macro.color, fontWeight: '700' }}>
                {macro.label}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <AppText
                  variant="headline"
                  style={{ fontSize: 24, lineHeight: 28, letterSpacing: -0.8 }}
                >
                  {Math.round(macro.value)}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  g
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </Panel>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.md,
        }}
      >
        <AppText variant="headline">Save as a template</AppText>
        <Switch
          accessibilityLabel="Save as a template"
          value={saveAsTemplate}
          onValueChange={setSaveAsTemplate}
          trackColor={{ false: colors.surfaceSunken, true: colors.primary }}
          thumbColor={saveAsTemplate ? colors.onPrimary : colors.textTertiary}
        />
      </View>

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <View style={{ marginTop: 'auto', paddingTop: space.xl }}>
        <Button
          label="Log meal"
          loading={saving || addFood.isPending}
          onPress={() => void save()}
        />
      </View>

      <Sheet
        visible={searchVisible}
        title="Add a component"
        subtitle="Nutrition per 100 g"
        onClose={() => setSearchVisible(false)}
      >
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Food"
              value={query}
              onChangeText={setQuery}
              placeholder="chicken breast, oats, olive oil…"
              onSubmitEditing={() => {
                if (query.trim().length >= 2) search.mutate(query.trim());
              }}
              returnKeyType="search"
              autoFocus
            />
          </View>
          <Button
            label="Search"
            size="small"
            loading={search.isPending}
            onPress={() => {
              if (query.trim().length >= 2) search.mutate(query.trim());
            }}
          />
        </View>

        <Button
          label="Scan a barcode"
          variant="secondary"
          size="small"
          onPress={() => {
            setSearchVisible(false);
            router.push('/scan-food?component=1' as never);
          }}
        />
        <Button
          label="Add a custom component instead"
          variant="secondary"
          size="small"
          onPress={() => {
            setSearchVisible(false);
            setManualVisible(true);
          }}
        />

        {search.isError ? (
          <AppText variant="footnote" tone="danger">
            {search.error.message}
          </AppText>
        ) : null}

        {search.data?.length === 0 ? (
          <AppText variant="footnote" tone="secondary">
            No matches. Try a simpler term or add a custom component.
          </AppText>
        ) : null}

        <FlatList
          data={search.data ?? []}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => addSearchResult(item)}
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
        />
      </Sheet>

      <Sheet
        visible={manualVisible}
        title="Custom component"
        subtitle="Values for this portion"
        onClose={() => setManualVisible(false)}
      >
        <TextField
          label="Name"
          value={manual.name}
          onChangeText={(value) => setManual((current) => ({ ...current, name: value }))}
          placeholder="Homemade sauce"
          maxLength={80}
          autoFocus
        />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Calories"
              value={manual.calories}
              onChangeText={(value) => setManual((current) => ({ ...current, calories: value }))}
              keyboardType="decimal-pad"
              placeholder="120"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Protein (g)"
              value={manual.protein}
              onChangeText={(value) => setManual((current) => ({ ...current, protein: value }))}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Carbs (g)"
              value={manual.carbs}
              onChangeText={(value) => setManual((current) => ({ ...current, carbs: value }))}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Fat (g)"
              value={manual.fat}
              onChangeText={(value) => setManual((current) => ({ ...current, fat: value }))}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
        </View>
        <Button label="Add component" onPress={addManual} />
      </Sheet>
    </Screen>
  );
}
