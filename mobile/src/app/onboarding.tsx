import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Switch, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { useProfile } from '@/features/profile/use-profile';
import { defaultFeatureFlags, FEATURE_FLAGS, type FeatureFlagKey } from '@/lib/feature-flags';
import { ACTIVITY_OPTIONS, calculateCalorieTarget, GOAL_OPTIONS } from '@/lib/health-utils';
import { useAuth } from '@/providers/auth-provider';
import { space, useTheme } from '@/theme';

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const FOCUS: Array<{
  value: 'health' | 'wealth' | 'relations';
  label: string;
  caption: string;
  icon: IconName;
}> = [
  { value: 'health', label: 'Health', caption: 'Sleep, movement, food and mind', icon: 'heart' },
  { value: 'wealth', label: 'Wealth', caption: 'Spending, saving and investing', icon: 'wallet' },
  { value: 'relations', label: 'Relations', caption: 'The people who matter', icon: 'people' },
];

const TITLES = ['Welcome', 'Your details', 'Your baseline', 'Your focus', 'Ready'];
const SUBTITLES = [
  'Three pillars, one reading.',
  'Name, age and gender.',
  'Used for calorie estimates on this device.',
  'Choose where to start and what to track.',
  'One last look before your first reading.',
];
const LAST_STEP = TITLES.length - 1;

const numberOr = (text: string, fallback: number): number => {
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default function Onboarding() {
  const { colors } = useTheme();
  const router = useRouter();
  const { markOnboarded } = useAuth();
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
    step === 0 || step === 3 || step === LAST_STEP
      ? true
      : step === 1
        ? firstName.trim().length > 0 && ageNum >= 13 && ageNum <= 100 && gender !== null
        : numberOr(height, 0) >= 80 && numberOr(weight, 0) >= 25;

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
    if (step === 2 && calories.trim() === '') setCalories(String(estimatedCalories));
    setStep((current) => Math.min(LAST_STEP, current + 1));
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
      await markOnboarded(true);
      router.replace('/(tabs)' as never);
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
        <View style={{ gap: space.xl }}>
          {step === 0 ? <BrandMark size={56} /> : <BrandMark size={32} animated={false} />}
          <PageHeader
            title={TITLES[step]}
            date={`Step ${step + 1} of ${TITLES.length}`}
            subtitle={SUBTITLES[step]}
          />
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {TITLES.map((_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: index <= step ? colors.primary : colors.separator,
                }}
              />
            ))}
          </View>
        </View>

        {step === 0 ? (
          <View style={{ gap: space.lg, paddingTop: space.sm }}>
            <AppText variant="callout" tone="secondary">
              Trinity brings sleep, money and the people around you into one reading — three rings
              that tell you where you stand today, and what would move it most.
            </AppText>
            <View style={{ gap: space.md }}>
              {FOCUS.map((option) => (
                <View
                  key={option.value}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
                >
                  <Icon name={option.icon} size={16} color={colors.primary} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="callout">{option.label}</AppText>
                    <AppText variant="footnote" tone="tertiary">
                      {option.caption}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
            <AppText variant="footnote" tone="tertiary">
              Takes about a minute. Everything stays on this device unless you sign in.
            </AppText>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: space.lg }}>
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
            <Chips label="Gender" options={GENDERS} value={gender} onChange={setGender} />
            <AppText variant="footnote" tone="tertiary">
              Used for calorie math and to show cycle tracking when relevant.
            </AppText>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: space.lg }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Height, cm"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="170"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Weight, kg"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="70"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
            </View>
            <TextField
              label="Target weight, kg (optional)"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder="Optional"
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Chips
              label="Activity level"
              options={ACTIVITY_OPTIONS}
              value={activity}
              onChange={setActivity}
            />
            <Chips label="Body goal" options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />
            <TextField
              label="Daily calorie target"
              value={calories}
              onChangeText={setCalories}
              placeholder={`Estimate: ${estimatedCalories} kcal`}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: space.lg }}>
            <View>
              {FOCUS.map((option, index) => {
                const selected = focus === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setFocus(option.value);
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.md,
                        paddingVertical: space.md,
                        paddingLeft: 10,
                        borderLeftWidth: 2,
                        borderLeftColor: selected ? colors.primary : 'transparent',
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: colors.separator,
                      }}
                    >
                      <Icon
                        name={option.icon}
                        size={18}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                      <View style={{ flex: 1, gap: 1 }}>
                        <AppText variant="callout">{option.label}</AppText>
                        <AppText variant="footnote" tone="tertiary">
                          {option.caption}
                        </AppText>
                      </View>
                      {selected ? <Icon name="check" size={16} color={colors.primary} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              label="A goal, in your own words (optional)"
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g. Sleep seven hours and save 200 a month"
              multiline
              maxLength={200}
            />

            <SectionHeader title="Track" caption="You can change these later" />
            <View>
              {FEATURE_FLAGS.slice(0, 6).map((flag, index) => (
                <View
                  key={flag.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.md,
                    minHeight: 56,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.separator,
                  }}
                >
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="callout">{flag.label}</AppText>
                    <AppText variant="footnote" tone="tertiary">
                      {flag.caption}
                    </AppText>
                  </View>
                  <Switch
                    value={flags[flag.key as FeatureFlagKey]}
                    onValueChange={(value) => {
                      setFlags((current) => ({ ...current, [flag.key]: value }));
                    }}
                    trackColor={{ true: colors.primary, false: colors.surfaceSunken }}
                    thumbColor={colors.background}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: space.lg }}>
            <View style={{ gap: space.xs }}>
              <AppText variant="headline">You're set, {firstName || 'there'}.</AppText>
              <AppText variant="footnote" tone="secondary">
                Focus: {FOCUS.find((option) => option.value === focus)?.label}. Daily target:{' '}
                {numberOr(calories, estimatedCalories)} kcal.
              </AppText>
            </View>
            <View style={{ gap: space.sm }}>
              {FEATURE_FLAGS.filter((flag) => flags[flag.key as FeatureFlagKey]).map((flag) => (
                <AppText key={flag.key} variant="caption" tone="tertiary">
                  · {flag.label}
                </AppText>
              ))}
            </View>
            <AppText variant="callout" tone="secondary">
              Your first reading starts at zero and fills in as you log. The rings, the score and
              the weekly experiment all read from the same records.
            </AppText>
          </View>
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
            {step < LAST_STEP ? (
              <Button
                label={step === 0 ? 'Get started' : 'Continue'}
                disabled={!canContinue}
                onPress={next}
              />
            ) : (
              <Button
                label="Start using Trinity"
                loading={saving}
                disabled={!canContinue}
                onPress={() => void finish()}
              />
            )}
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
