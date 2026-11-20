import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FooterBackButton } from '@/components/ui/detail-header';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useHealth } from '@/features/health/use-health';
import { useFormSubmit } from '@/lib/use-form-submit';
import { fonts, radius, space, useTheme } from '@/theme';

const MEALS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const parseNumber = (text: string): number => {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
};

const Counter = ({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={5}
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
      {children}
    </Pressable>
  );
};

const MacroRow = ({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        minHeight: 72,
        borderRadius: radius.inner,
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
      }}
    >
      <AppText variant="headline" style={{ flex: 1, color }}>
        {label}
      </AppText>
      <Counter label={`Decrease ${label}`} onPress={() => onChange(Math.max(0, value - 5))}>
        <AppText variant="headline" tone="secondary" style={{ fontSize: 23 }}>
          −
        </AppText>
      </Counter>
      <View style={{ width: 58, alignItems: 'center' }}>
        <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
          {value} g
        </AppText>
      </View>
      <Counter label={`Increase ${label}`} onPress={() => onChange(value + 5)}>
        <Icon name="plus" size={20} color={colors.text} />
      </Counter>
    </View>
  );
};

export const FoodForm = ({ recordId }: { recordId?: string; meal?: boolean }) => {
  const { colors } = useTheme();
  const { data, addFood, updateFood } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const existing = data?.food.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setName(existing.food_name);
    setMealType(existing.meal_type ?? 'lunch');
    setCalories(existing.total_calories !== null ? String(Math.round(existing.total_calories)) : '');
    setProtein(Math.round(existing.protein_g ?? 0));
    setCarbs(Math.round(existing.carbs_g ?? 0));
    setFat(Math.round(existing.fat_g ?? 0));
    setFiber(existing.fiber_g !== null && existing.fiber_g !== undefined ? String(existing.fiber_g) : '');
    setSugar(existing.sugar_g !== null && existing.sugar_g !== undefined ? String(existing.sugar_g) : '');
    setSodium(existing.sodium_mg !== null && existing.sodium_mg !== undefined ? String(existing.sodium_mg) : '');
    setNotes(existing.notes ?? '');
    if (existing.consumed_at) setDate(new Date(existing.consumed_at));
  }, [existing?.id]);

  const macroCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const typedCalories = parseNumber(calories);
  const kcal = typedCalories > 0 ? Math.round(typedCalories) : macroCalories;

  const save = () => {
    if (kcal <= 0) {
      setError('Add calories or a few macros.');
      return;
    }
    const input = {
      name: name.trim() || 'Quick food',
      meal: mealType,
      calories: kcal,
      protein,
      carbs,
      fat,
      fiber: parseNumber(fiber),
      sugar: parseNumber(sugar),
      sodium: Math.round(parseNumber(sodium)),
      notes,
      micros: existing?.micronutrients ?? undefined,
      components: existing?.components,
      occurredAt: date.toISOString(),
    };
    void submit(() =>
      existing ? updateFood.mutateAsync({ id: existing.id, ...input }) : addFood.mutateAsync(input),
    );
  };

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.xl, paddingBottom: space.xxl, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
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
      <AppText variant="title">{existing ? 'Edit food' : 'Enter manually'}</AppText>

      <View style={{ alignItems: 'center', gap: 0, marginTop: -space.sm }}>
        <TextInput
          accessibilityLabel="Calories"
          value={calories}
          onChangeText={setCalories}
          placeholder="0"
          placeholderTextColor={colors.text}
          keyboardType="number-pad"
          maxLength={5}
          style={{
            width: '100%',
            textAlign: 'center',
            color: colors.text,
            fontFamily: fonts.black,
            fontSize: 82,
            lineHeight: 88,
            letterSpacing: -4,
            padding: 0,
          }}
        />
        <AppText variant="headline" tone="secondary" style={{ marginTop: -6 }}>
          kcal · let macros fill it in
        </AppText>
      </View>

      <TextInput
        accessibilityLabel="What was it"
        value={name}
        onChangeText={setName}
        placeholder="What was it? (optional)"
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

      <View style={{ gap: space.sm }}>
        <MacroRow label="Protein" color={colors.primary} value={protein} onChange={setProtein} />
        <MacroRow label="Carbs" color={colors.bonds} value={carbs} onChange={setCarbs} />
        <MacroRow label="Fat" color={colors.wealth} value={fat} onChange={setFat} />
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
          MEAL
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {MEALS.map((option) => {
            const selected = mealType === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setMealType(option.value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 54,
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
      </View>

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 'auto', paddingTop: space.xl }}>
        <FooterBackButton fallback="/(tabs)/health" />
        <View style={{ flex: 1 }}>
          <Button
            label={existing ? 'Save changes' : 'Log it'}
            loading={saving}
            onPress={save}
          />
        </View>
      </View>
    </Screen>
  );
};
