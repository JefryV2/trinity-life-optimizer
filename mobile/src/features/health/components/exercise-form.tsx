import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useHealth } from '@/features/health/use-health';
import { useFormSubmit } from '@/lib/use-form-submit';
import { fonts, radius, space, useTheme } from '@/theme';

const TYPES: Array<{ value: string; label: string; icon: IconName }> = [
  { value: 'cardio', label: 'Cardio', icon: 'pulse' },
  { value: 'strength', label: 'Strength', icon: 'dumbbell' },
  { value: 'flexibility', label: 'Flexibility', icon: 'body' },
  { value: 'sport', label: 'Sport', icon: 'globe' },
];

const INTENSITIES = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

const dateLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const LargeCounter = ({
  label,
  value,
  unit,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  unit: string;
  onMinus: () => void;
  onPlus: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: space.sm }}>
      <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <AppText
          variant="display"
          style={{ fontSize: 48, lineHeight: 52, letterSpacing: -2.5 }}
        >
          {value}
        </AppText>
        <AppText variant="callout" tone="tertiary">
          {unit}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={onMinus}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <AppText variant="headline" tone="secondary" style={{ fontSize: 24 }}>
            −
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={onPlus}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
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
      </View>
    </View>
  );
};

export const ExerciseForm = ({ recordId }: { recordId?: string }) => {
  const { colors } = useTheme();
  const { data, addExercise, updateExercise } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [type, setType] = useState('cardio');
  const [duration, setDuration] = useState(30);
  const [calories, setCalories] = useState(0);
  const [intensity, setIntensity] = useState('moderate');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const existing = data?.exercise.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setName(existing.exercise_name);
    setType(existing.exercise_type ?? 'cardio');
    setDuration(existing.duration_minutes ?? 30);
    setCalories(existing.calories_burned ?? 0);
    setIntensity(existing.intensity ?? 'moderate');
    setNotes(existing.notes ?? '');
    if (existing.completed_at) setDate(new Date(existing.completed_at));
  }, [existing?.id]);

  const recent = Array.from(
    new Map(
      (data?.exercise ?? []).map((entry) => [
        entry.exercise_name,
        {
          name: entry.exercise_name,
          type: entry.exercise_type ?? 'cardio',
          duration: entry.duration_minutes ?? 30,
          calories: entry.calories_burned ?? 0,
          intensity: entry.intensity ?? 'moderate',
        },
      ]),
    ).values(),
  ).slice(0, 4);

  const save = () => {
    if (duration <= 0) {
      setError('Add how long the session lasted.');
      return;
    }
    const input = {
      name: name.trim() || 'Workout',
      type,
      duration,
      calories,
      intensity,
      notes,
      completedAt: date.toISOString(),
    };
    void submit(() =>
      existing
        ? updateExercise.mutateAsync({ id: existing.id, ...input })
        : addExercise.mutateAsync(input),
    );
  };

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.xxl, paddingBottom: space.xxl, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="caption" tone="primary" style={{ letterSpacing: 1.2 }}>
          LOG
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="close" size={21} color={colors.textSecondary} />
        </Pressable>
      </View>

      <AppText variant="title">{existing ? 'Edit exercise' : 'Log exercise'}</AppText>

      {recent.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
            RECENT
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {recent.map((entry) => (
              <Pressable
                key={entry.name}
                accessibilityRole="button"
                onPress={() => {
                  setName(entry.name);
                  setType(entry.type);
                  setDuration(entry.duration);
                  setCalories(entry.calories);
                  setIntensity(entry.intensity);
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: space.lg,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <AppText variant="callout" style={{ fontWeight: '700' }}>
                  {entry.name}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <TextField
        label="Session"
        value={name}
        onChangeText={setName}
        placeholder="Morning run, push day, yoga…"
        maxLength={80}
      />

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
          TYPE
        </AppText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.xs }}>
          {TYPES.map((option) => {
            const selected = type === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setType(option.value)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <View
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: radius.pill,
                    backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    name={option.icon}
                    size={28}
                    color={selected ? colors.onPrimary : colors.textSecondary}
                  />
                </View>
                <AppText
                  variant="footnote"
                  tone={selected ? 'primary' : 'secondary'}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ fontWeight: selected ? '800' : '500', textAlign: 'center' }}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <LargeCounter
          label="DURATION (MIN)"
          value={duration}
          unit="min"
          onMinus={() => setDuration((value) => Math.max(0, value - 5))}
          onPlus={() => setDuration((value) => value + 5)}
        />
        <LargeCounter
          label="CALORIES (OPTIONAL)"
          value={calories}
          unit="kcal"
          onMinus={() => setCalories((value) => Math.max(0, value - 25))}
          onPlus={() => setCalories((value) => value + 25)}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
          INTENSITY
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.pill,
            padding: 4,
            gap: 2,
          }}
        >
          {INTENSITIES.map((option) => {
            const selected = intensity === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setIntensity(option.value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 44,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText
                  variant="callout"
                  style={{
                    color: selected ? colors.onPrimary : colors.textSecondary,
                    fontWeight: selected ? '800' : '600',
                  }}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
          WHEN
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Date ${dateLabel(date)}`}
          onPress={() => setCalendarVisible(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingBottom: space.sm,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <AppText
            variant="headline"
            style={{ flex: 1, fontSize: 30, lineHeight: 34, letterSpacing: -1 }}
          >
            {dateLabel(date)}
          </AppText>
          <Icon name="calendar" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Felt strong, new PB…"
        multiline
        maxLength={300}
      />

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <View style={{ marginTop: 'auto', paddingTop: space.xl }}>
        <Button
          label={existing ? 'Save changes' : 'Save session'}
          loading={saving}
          onPress={save}
        />
      </View>

      <CalendarSheet
        visible={calendarVisible}
        value={date}
        onClose={() => setCalendarVisible(false)}
        onSelect={setDate}
      />
    </Screen>
  );
};
