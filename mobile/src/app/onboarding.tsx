import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Switch, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useProfile } from '@/features/profile/use-profile';
import { defaultFeatureFlags, FEATURE_FLAGS, type FeatureFlagKey } from '@/lib/feature-flags';
import { ACTIVITY_OPTIONS, calculateCalorieTarget, GOAL_OPTIONS } from '@/lib/health-utils';
import { radius, space, useTheme } from '@/theme';

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const FOCUS: Array<{ value: 'health' | 'wealth' | 'relations'; label: string; caption: string; icon: IconName }> = [
  { value: 'health', label: 'Health', caption: 'Sleep, movement, food and mind', icon: 'heart' },
  { value: 'wealth', label: 'Wealth', caption: 'Spending, saving and investing', icon: 'wallet' },
  { value: 'relations', label: 'Relations', caption: 'The people who matter', icon: 'people' },
];

const numberOr = (text: string, fallback: number): number => {
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default function Onboarding() {
  const { colors } = useTheme();
  const { saveProfile, saveHealthProfile, savePreferences, completeOnboarding } = useProfile();

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [goalType, setGoalType] = useState('maintain');
  const [calories, setCalories] = useState('');
  const [focus, setFocus] = useState<'health' | 'wealth' | 'relations'>('health');
  const [goal, setGoal] = useState('');
  const [flags, setFlags] = useState(defaultFeatureFlags);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ageNum = numberOr(age, 0);
  const canContinue =
    step === 0
      ? firstName.trim().length > 0 && ageNum >= 13 && ageNum <= 100 && gender !== null
      : step === 1
        ? numberOr(height, 0) >= 80 && numberOr(weight, 0) >= 25
        : true;

  const estimatedCalories =
    ageNum > 0 && numberOr(height, 0) > 0 && numberOr(weight, 0) > 0
      ? calculateCalorieTarget({
          gender,
          age: ageNum,
          heightCm: numberOr(height, 170),
          weightKg: numberOr(weight, 70),
          activityLevel: activity,
          goalType,
        })
      : 2000;

  const next = () => {
    setError(null);
    if (step === 1 && calories.trim() === '') setCalories(String(estimatedCalories));
    void Haptics.selectionAsync();
    setStep((current) => current + 1);
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProfile.mutateAsync({ firstName, lastName });
      const birthYear = new Date().getFullYear() - ageNum;
      await saveHealthProfile.mutateAsync({
        birthDate: `${birthYear}-01-01`,
        gender,
        heightCm: numberOr(height, 0) || null,
        weightKg: numberOr(weight, 0) || null,
        targetWeightKg: numberOr(targetWeight, 0) || null,
        activityLevel: activity,
        goalType,
        dailyCalories: numberOr(calories, estimatedCalories),
      });
      await completeOnboarding.mutateAsync({
        firstName,
        lastName,
        focus,
        goal: goal.trim() || `Get stronger in ${focus}`,
      });
      // completeOnboarding rewrites data_preferences, so merge the flags after it.
      await savePreferences.mutateAsync(flags);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Screen contentContainerStyle={{ paddingTop: space.xxl }}>
        <View style={{ alignItems: 'center', gap: space.md }}>
          <BrandMark size={56} />
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {step === 0 ? 'Welcome to Trinity' : step === 1 ? 'Your body, your baseline' : 'Make it yours'}
          </AppText>
          <AppText variant="footnote" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            {step === 0
              ? 'Three pillars — health, wealth, relations. A minute of setup makes every score honest.'
              : step === 1
                ? 'We use this to estimate calorie targets and recovery needs. Nothing is shared.'
                : 'Pick where to start and what to switch on. You can change all of this later.'}
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={{
                  width: index === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index <= step ? colors.primary : colors.surfaceSunken,
                }}
              />
            ))}
          </View>
        </View>

        {step === 0 ? (
          <Card style={{ gap: space.lg }}>
            <TextField
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="How should we call you?"
              autoCapitalize="words"
              autoComplete="given-name"
            />
            <TextField
              label="Last name (optional)"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Optional"
              autoCapitalize="words"
              autoComplete="family-name"
            />
            <TextField
              label="Age"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={{ gap: space.sm }}>
              <AppText variant="caption" tone="secondary">
                Gender
              </AppText>
              <Chips options={GENDERS} value={gender} onChange={setGender} />
              <AppText variant="caption" tone="tertiary">
                Used for calorie math and to show cycle tracking when relevant.
              </AppText>
            </View>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card style={{ gap: space.lg }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Height (cm)"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="170"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Weight (kg)"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="70"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
            </View>
            <TextField
              label="Target weight (kg, optional)"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder="Skip if you like where you are"
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <View style={{ gap: space.sm }}>
              <AppText variant="caption" tone="secondary">
                Activity level
              </AppText>
              <Chips options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
            </View>
            <View style={{ gap: space.sm }}>
              <AppText variant="caption" tone="secondary">
                Body goal
              </AppText>
              <Chips options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />
            </View>
            <TextField
              label="Daily calorie target"
              value={calories}
              onChangeText={setCalories}
              placeholder={`Estimated: ${estimatedCalories} kcal`}
              keyboardType="number-pad"
              maxLength={5}
              helper={`Mifflin-St Jeor estimate: ${estimatedCalories} kcal. Adjust if you know better.`}
            />
          </Card>
        ) : null}

        {step === 2 ? (
          <>
            <View style={{ gap: space.md }}>
              {FOCUS.map((option) => {
                const selected = focus === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setFocus(option.value);
                    }}
                    style={({ pressed }) => ({
                      borderRadius: radius.card,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Card
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.md,
                        borderWidth: selected ? 2 : 0,
                        borderColor: selected ? colors.primary : 'transparent',
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: radius.small,
                          backgroundColor: colors.primarySoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={option.icon} size={19} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="callout" style={{ fontWeight: '600' }}>
                          {option.label}
                        </AppText>
                        <AppText variant="caption" tone="tertiary">
                          {option.caption}
                        </AppText>
                      </View>
                      {selected ? <Icon name="check" size={18} color={colors.primary} /> : null}
                    </Card>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              label="What do you want from Trinity? (optional)"
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g. Sleep 7+ hours and stop living paycheck to paycheck"
              multiline
              maxLength={200}
            />

            <Card padded={false} style={{ paddingHorizontal: space.xl }}>
              {FEATURE_FLAGS.slice(0, 6).map((flag, index) => (
                <View
                  key={flag.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.md,
                    minHeight: 56,
                    borderBottomWidth: index === 5 ? 0 : 1,
                    borderBottomColor: colors.separator,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="callout">{flag.label}</AppText>
                    <AppText variant="caption" tone="tertiary">
                      {flag.caption}
                    </AppText>
                  </View>
                  <Switch
                    value={flags[flag.key as FeatureFlagKey]}
                    onValueChange={(value) => {
                      void Haptics.selectionAsync();
                      setFlags((current) => ({ ...current, [flag.key]: value }));
                    }}
                    trackColor={{ true: colors.primary, false: colors.surfaceSunken }}
                    thumbColor={colors.surface}
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {error ? (
          <AppText variant="footnote" tone="danger" selectable>
            {error}
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', gap: space.md }}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <Button label="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} />
            </View>
          ) : null}
          <View style={{ flex: 2 }}>
            {step < 2 ? (
              <Button label="Continue" disabled={!canContinue} onPress={next} />
            ) : (
              <Button label="Start my Trinity" loading={saving} onPress={() => void finish()} />
            )}
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}