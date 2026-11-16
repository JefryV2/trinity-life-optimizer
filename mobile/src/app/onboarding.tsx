import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, View } from 'react-native';

import { Wordmark } from '@/components/wordmark';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { arrival } from '@/features/landing/arrival-overlay';
import { track } from '@/lib/analytics';
import { useProfile } from '@/features/profile/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { calculateCalorieTarget } from '@/lib/health-utils';
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
  { value: 'relations', label: 'People', caption: 'The people who matter', icon: 'people' },
];

const TITLES = ['Welcome', 'Your details', 'Your focus'];
const SUBTITLES = [
  'Three pillars, one reading.',
  'Name, age and gender.',
  'Choose where to start.',
];
const LAST_STEP = TITLES.length - 1;

const numberOr = (text: string, fallback: number): number => {
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default function Onboarding() {
  const { colors } = useTheme();
  const router = useRouter();
  const { markOnboarded, user } = useAuth();
  const { saveProfile, saveHealthProfile, completeOnboarding } = useProfile();

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(() => {
    const name = user?.user_metadata?.first_name;
    return typeof name === 'string' ? name : '';
  });
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [focus, setFocus] = useState<'health' | 'wealth' | 'relations'>('health');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ageNum = numberOr(age, 0);
  const heightCm = numberOr(height, 0) || null;
  const weightKg = numberOr(weight, 0) || null;
  const estimatedCalories =
    heightCm && weightKg && ageNum
      ? calculateCalorieTarget({
          gender,
          age: ageNum,
          heightCm,
          weightKg,
          activityLevel: 'moderate',
          goalType: 'maintain',
        })
      : null;
  const canContinue =
    step === 0 || step === 2
      ? true
      : firstName.trim().length > 0 && ageNum >= 13 && ageNum <= 100 && gender !== null;

  const next = () => {
    setError(null);
    setStep((current) => Math.min(LAST_STEP, current + 1));
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    // The overlay is owned by the root navigator, so it keeps playing while
    // onboarding is replaced by the dashboard underneath it.
    arrival.start();
    try {
      await saveProfile.mutateAsync({ firstName, lastName: '' });
      const birthYear = new Date().getFullYear() - ageNum;
      await saveHealthProfile.mutateAsync({
        birthDate: `${birthYear}-01-01`,
        gender,
        heightCm,
        weightKg,
        targetWeightKg: null,
        activityLevel: 'moderate',
        goalType: 'maintain',
        dailyCalories: estimatedCalories,
      });
      await completeOnboarding.mutateAsync({
        firstName,
        lastName: '',
        focus,
        goal: goal.trim() || `Get stronger in ${focus}`,
      });
      await markOnboarded(true);
      void track('onboarding_completed', { focus });

      router.replace('/(tabs)' as never);
      // Give the tabs screen a frame to mount beneath the overlay before the
      // wordmark starts dissolving into it.
      setTimeout(() => arrival.navigated(), 120);
    } catch (caught) {
      arrival.dismiss();
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.');
      setSaving(false);
    }
  };

  return (
    <>
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Screen contentContainerStyle={{ paddingTop: space.xxl }}>
        <View style={{ gap: space.xl }}>
          {step === 0 ? <Wordmark height={36} /> : <Wordmark height={24} />}
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
              Auxo brings sleep, money and the people around you into one reading — three rings
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
              Takes about a minute. Your entries stay private to your account.
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
              label="Age"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Chips label="Gender" options={GENDERS} value={gender} onChange={setGender} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Height (cm, optional)"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="170"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Weight (kg, optional)"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="65"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
            </View>
            <AppText variant="footnote" tone="tertiary">
              Height and weight sharpen your calorie and protein targets. You can add them later in Profile.
            </AppText>
          </View>
        ) : null}

        {step === 2 ? (
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
                label="Start using Auxo"
                loading={saving}
                disabled={!canContinue}
                onPress={() => void finish()}
              />
            )}
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
    </>
  );
}
