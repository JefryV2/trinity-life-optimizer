import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useProfile } from '@/features/profile/use-profile';
import {
  cmToDisplay,
  displayToCm,
  displayToKg,
  kgToDisplay,
  useSettings,
} from '@/features/settings/use-settings';
import { daysBetween, formatNumber, initials, isoDate } from '@/lib/format';
import { calculateCalorieTarget } from '@/lib/health-utils';
import { fonts, radius, space, useTheme } from '@/theme';

const parseNumber = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const PACE_OPTIONS = [
  { value: 0.25, label: '0.25 kg/wk' },
  { value: 0.5, label: '0.5 kg/wk' },
  { value: 0.75, label: '0.75 kg/wk' },
];

const GOALS = [
  {
    value: 'lose',
    label: 'Lose weight',
    detail: 'Eat a little under your needs',
    icon: 'arrowDown' as const,
  },
  {
    value: 'maintain',
    label: 'Maintain weight',
    detail: 'Stay where you are',
    icon: null,
  },
  {
    value: 'gain',
    label: 'Gain weight',
    detail: 'Eat a little over your needs',
    icon: 'arrowUp' as const,
  },
];

const FieldBox = ({
  label,
  value,
  onChangeText,
  suffix,
  keyboardType = 'default',
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  inputRef?: React.RefObject<React.ComponentRef<typeof TextInput> | null>;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minHeight: 60,
        borderRadius: radius.inner,
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: space.md,
        paddingVertical: 8,
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.7 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={6}
          placeholder="—"
          placeholderTextColor={colors.textFaint}
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: fonts.bold,
            fontSize: 22,
            lineHeight: 27,
            padding: 0,
          }}
        />
        {suffix ? (
          <AppText variant="footnote" tone="tertiary">
            {suffix}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const Stepper = ({
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

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, saveProfile, saveHealthProfile, savePreferences } =
    useProfile();
  const { weightUnit, heightUnit } = useSettings();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthVisible, setBirthVisible] = useState(false);
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [goal, setGoal] = useState('lose');
  const [pace, setPace] = useState(0.5);
  const [calories, setCalories] = useState('');
  const [calorieOverride, setCalorieOverride] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const firstNameRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);

  useEffect(() => {
    if (!data) return;
    const savedPreferences = (data.profile?.data_preferences ?? {}) as {
      pace?: number;
      activity?: string;
    };
    setFirstName(data.profile?.first_name ?? '');
    setLastName(data.profile?.last_name ?? '');
    setBirthDate(data.health?.birth_date ? new Date(data.health.birth_date) : null);
    setGender(data.health?.gender === 'female' ? 'female' : 'male');
    setHeight(
      data.health?.height_cm ? String(cmToDisplay(data.health.height_cm, heightUnit)) : '',
    );
    setWeight(
      data.health?.weight_kg ? String(kgToDisplay(data.health.weight_kg, weightUnit)) : '',
    );
    setTargetWeight(
      data.health?.target_weight_kg
        ? String(kgToDisplay(data.health.target_weight_kg, weightUnit))
        : '',
    );
    setActivity(savedPreferences.activity ?? data.health?.activity_level ?? 'moderate');
    setGoal(data.health?.goal_type ?? 'lose');
    setPace(typeof savedPreferences.pace === 'number' ? savedPreferences.pace : 0.5);
    setCalories(data.health?.daily_caloric_target ? String(data.health.daily_caloric_target) : '');
    setCalorieOverride(false);
  }, [data, heightUnit, weightUnit]);

  const age = birthDate ? Math.max(13, Math.floor(daysBetween(birthDate) / 365.25)) : null;

  const estimatedCalories = useMemo(() => {
    const heightValue = parseNumber(height);
    const weightValue = parseNumber(weight);
    if (!birthDate || !heightValue || !weightValue) return null;
    return calculateCalorieTarget({
      gender,
      age: Math.max(13, Math.floor(daysBetween(birthDate) / 365.25)),
      heightCm: displayToCm(heightValue, heightUnit),
      weightKg: displayToKg(weightValue, weightUnit),
      activityLevel: activity,
      goalType: goal,
    });
  }, [activity, birthDate, gender, goal, height, heightUnit, weight, weightUnit]);

  const calorieValue = calorieOverride
    ? parseNumber(calories) ?? estimatedCalories ?? 2000
    : estimatedCalories ?? parseNumber(calories) ?? 2000;
  const weightKg = parseNumber(weight) ? displayToKg(parseNumber(weight)!, weightUnit) : 70;
  const proteinTarget = Math.round(weightKg * 1.6);
  const fatTarget = Math.round((calorieValue * 0.3) / 9);
  const carbTarget = Math.max(
    0,
    Math.round((calorieValue - proteinTarget * 4 - fatTarget * 9) / 4),
  );

  const adjustCalories = (delta: number) => {
    const next = Math.max(1200, Math.round((calorieValue + delta) / 10) * 10);
    setCalories(String(next));
    setCalorieOverride(true);
  };

  const adjustTargetWeight = (delta: number) => {
    const current = parseNumber(targetWeight) ?? (parseNumber(weight) ?? 70);
    const next = Math.max(1, Math.round((current + delta) * 10) / 10);
    setTargetWeight(String(next));
  };

  const save = async () => {
    setMessage(null);
    const heightValue = parseNumber(height);
    const weightValue = parseNumber(weight);
    const targetValue = parseNumber(targetWeight);
    try {
      await saveProfile.mutateAsync({ firstName, lastName });
      await saveHealthProfile.mutateAsync({
        birthDate: birthDate ? isoDate(birthDate) : null,
        gender,
        heightCm: heightValue ? displayToCm(heightValue, heightUnit) : null,
        weightKg: weightValue ? displayToKg(weightValue, weightUnit) : null,
        targetWeightKg:
          goal === 'maintain' || !targetValue ? null : displayToKg(targetValue, weightUnit),
        activityLevel: activity,
        goalType: goal,
        dailyCalories: calorieValue,
      });
      await savePreferences.mutateAsync({ pace, activity });
      setMessage('Profile saved.');
      router.back();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not save profile.');
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl, paddingBottom: space.xxl, flexGrow: 1 }}>
      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data ? (
        <>
          <View style={{ gap: 2 }}>
            <AppText variant="title">Profile</AppText>
            <AppText variant="callout" tone="secondary">
              Used to work out your daily target
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit your name"
              onPress={() => firstNameRef.current?.focus()}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 28,
                    lineHeight: 32,
                    letterSpacing: -0.6,
                    color: colors.textSecondary,
                  }}
                >
                  {initials(firstName, lastName)}
                </AppText>
              </View>
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 26,
                  height: 26,
                  borderRadius: radius.pill,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: colors.background,
                }}
              >
                <Icon name="edit" size={12} color={colors.onPrimary} />
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: space.sm }}>
              <FieldBox
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                inputRef={firstNameRef}
              />
              <FieldBox label="Surname" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
              SEX
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
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ].map((option) => {
                const selected = gender === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setGender(option.value)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 46,
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
                        fontWeight: '800',
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
              BODY METRICS
            </AppText>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <FieldBox
                label="HEIGHT"
                value={height}
                onChangeText={setHeight}
                suffix={heightUnit}
                keyboardType="decimal-pad"
              />
              <FieldBox
                label="WEIGHT"
                value={weight}
                onChangeText={setWeight}
                suffix={weightUnit}
                keyboardType="decimal-pad"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Age${age ? `, ${age}` : ''}. Tap to set birth date`}
                onPress={() => setBirthVisible(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 60,
                  borderRadius: radius.inner,
                  backgroundColor: colors.surfaceAlt,
                  paddingHorizontal: space.md,
                  paddingVertical: 8,
                  justifyContent: 'center',
                  gap: 1,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.7 }}>
                  AGE
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <AppText
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 22,
                      lineHeight: 27,
                      letterSpacing: -0.6,
                    }}
                  >
                    {age ?? '—'}
                  </AppText>
                  <AppText variant="footnote" tone="tertiary">
                    yrs
                  </AppText>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
              YOUR GOAL
            </AppText>
            {GOALS.map((option) => {
              const selected = goal === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setGoal(option.value)}
                  style={({ pressed }) => ({
                    minHeight: 72,
                    borderRadius: radius.group,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primarySoft : colors.surfaceAlt,
                    paddingHorizontal: space.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {option.icon ? (
                      <Icon
                        name={option.icon}
                        size={22}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                    ) : (
                      <AppText
                        variant="headline"
                        tone={selected ? 'primary' : 'secondary'}
                        style={{ fontSize: 22 }}
                      >
                        =
                      </AppText>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="headline">{option.label}</AppText>
                    <AppText variant="footnote" tone="secondary">
                      {option.detail}
                    </AppText>
                  </View>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: radius.pill,
                      borderWidth: selected ? 0 : 1,
                      borderColor: colors.border,
                      backgroundColor: selected ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {goal !== 'maintain' ? (
            <Panel style={{ gap: space.md }}>
              <AppText
                variant="caption"
                tone="secondary"
                style={{ textAlign: 'center', letterSpacing: 1 }}
              >
                TARGET WEIGHT
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stepper label="Decrease target weight" onPress={() => adjustTargetWeight(-0.5)}>
                  <AppText variant="headline" tone="secondary" style={{ fontSize: 24 }}>
                    −
                  </AppText>
                </Stepper>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <TextInput
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    keyboardType="decimal-pad"
                    maxLength={5}
                    placeholder="—"
                    placeholderTextColor={colors.textFaint}
                    accessibilityLabel={`Target weight in ${weightUnit}`}
                    style={{
                      minWidth: 96,
                      textAlign: 'center',
                      color: colors.text,
                      fontFamily: fonts.black,
                      fontSize: 46,
                      lineHeight: 50,
                      letterSpacing: -2.2,
                      padding: 0,
                    }}
                  />
                  <AppText variant="callout" tone="secondary">
                    {weightUnit}
                  </AppText>
                </View>
                <Stepper label="Increase target weight" onPress={() => adjustTargetWeight(0.5)}>
                  <Icon name="plus" size={21} color={colors.text} />
                </Stepper>
              </View>
              <View style={{ gap: space.sm }}>
                <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
                  PACE
                </AppText>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  {PACE_OPTIONS.map((option) => {
                    const selected = pace === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setPace(option.value)}
                        style={({ pressed }) => ({
                          flex: 1,
                          minHeight: 46,
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
                          variant="footnote"
                          style={{
                            color: selected ? colors.onPrimary : colors.textSecondary,
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
            </Panel>
          ) : null}

          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
              DAILY CALORIE TARGET
            </AppText>
            <Panel style={{ gap: space.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
                  DAILY TARGET
                </AppText>
                <View
                  style={{
                    borderRadius: radius.pill,
                    backgroundColor: colors.primarySoft,
                    paddingHorizontal: space.sm,
                    paddingVertical: 3,
                  }}
                >
                  <AppText
                    variant="caption"
                    tone={calorieOverride ? 'secondary' : 'primary'}
                    style={{ letterSpacing: 0.3 }}
                  >
                    {calorieOverride ? 'Custom' : 'Auto'}
                  </AppText>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stepper label="Decrease calorie target" onPress={() => adjustCalories(-50)}>
                  <AppText variant="headline" tone="secondary" style={{ fontSize: 24 }}>
                    −
                  </AppText>
                </Stepper>
                <View style={{ alignItems: 'center' }}>
                  <AppText
                    variant="display"
                    style={{ fontSize: 52, lineHeight: 56, letterSpacing: -3 }}
                  >
                    {formatNumber(calorieValue)}
                  </AppText>
                  <AppText variant="footnote" tone="secondary">
                    kcal per day
                  </AppText>
                </View>
                <Stepper label="Increase calorie target" onPress={() => adjustCalories(50)}>
                  <Icon name="plus" size={21} color={colors.text} />
                </Stepper>
              </View>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {[
                  { label: 'Protein', value: proteinTarget, color: colors.primary },
                  { label: 'Carbs', value: carbTarget, color: colors.bonds },
                  { label: 'Fat', value: fatTarget, color: colors.wealth },
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
                    <AppText
                      variant="callout"
                      style={{ color: macro.color, fontWeight: '700' }}
                    >
                      {macro.label}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <AppText
                        variant="headline"
                        style={{ fontSize: 24, lineHeight: 28, letterSpacing: -0.8 }}
                      >
                        {macro.value}
                      </AppText>
                      <AppText variant="footnote" tone="tertiary">
                        g
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </Panel>
            <AppText variant="footnote" tone="tertiary">
              Updates when you change your body metrics or goal. Tap − or + to adjust it by hand.
            </AppText>
          </View>

          {message && message !== 'Profile saved.' ? (
            <AppText variant="footnote" tone="danger" selectable>
              {message}
            </AppText>
          ) : null}

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
              <Button
                label="Save changes"
                loading={saveProfile.isPending || saveHealthProfile.isPending || savePreferences.isPending}
                onPress={() => void save()}
              />
            </View>
          </View>

          <CalendarSheet
            visible={birthVisible}
            value={birthDate ?? new Date(1990, 0, 1)}
            onClose={() => setBirthVisible(false)}
            onSelect={setBirthDate}
          />
        </>
      ) : null}
    </Screen>
  );
}
