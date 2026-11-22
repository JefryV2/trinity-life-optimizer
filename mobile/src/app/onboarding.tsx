import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type TextInputProps,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/reveal';
import { OnboardingAuth } from '@/features/onboarding/onboarding-auth';
import {
  applyOnboardingDraft,
  readOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
  type OnboardingFocus,
} from '@/features/onboarding/onboarding-draft';
import { CompletionRings, OnboardingRings } from '@/features/onboarding/onboarding-rings';
import { useAuth } from '@/providers/auth-provider';
import { fonts, space } from '@/theme';

const LIME = '#C6F24E';
const AMBER = '#FFB020';
const BLUE = '#6F9BFF';
const BLACK = '#0A0A0A';

type Palette = { bg: string; ink: string };
type Phase = 'steps' | 'done' | 'auth';
type Step = 1 | 2 | 3;

const SCREEN: Record<OnboardingFocus, Palette> = {
  health: { bg: LIME, ink: '#17220A' },
  wealth: { bg: AMBER, ink: '#2C1A00' },
  relations: { bg: BLUE, ink: '#0B1745' },
};

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const FOCUS: Array<{
  value: OnboardingFocus;
  label: string;
  caption: string;
  number: string;
}> = [
  { value: 'health', label: 'Health', caption: 'Sleep, movement, food and mind', number: '01' },
  { value: 'wealth', label: 'Wealth', caption: 'Spending, saving and investing', number: '02' },
  { value: 'relations', label: 'People', caption: 'The people who matter', number: '03' },
];

const alpha = (hex: string, opacity: number) => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const value = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${value}`;
};

const colorFor = (step: Step, _focus: OnboardingFocus): Palette =>
  step === 1 ? SCREEN.health : step === 2 ? SCREEN.wealth : SCREEN.relations;

const numberOrNull = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const Field = ({
  label,
  ink,
  accent,
  ...rest
}: TextInputProps & { label: string; ink: string; accent: string }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 18 }}>
      <AppText
        style={{
          color: alpha(ink, 0.65),
          fontFamily: fonts.semibold,
          fontSize: 11,
          letterSpacing: 1.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </AppText>
      <TextInput
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        placeholderTextColor={alpha(ink, 0.4)}
        style={{
          minHeight: 46,
          borderBottomWidth: 2,
          borderBottomColor: focused ? accent : alpha(ink, 0.3),
          color: ink,
          fontFamily: fonts.medium,
          fontSize: 22,
          paddingTop: 7,
          paddingBottom: 9,
          paddingHorizontal: 0,
        }}
      />
    </View>
  );
};

const BackPill = ({
  ink,
  onPress,
}: {
  ink: string;
  onPress: (event: GestureResponderEvent) => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Back"
    onPress={onPress}
    style={({ pressed }) => ({
      width: 92,
      height: 62,
      borderRadius: 31,
      backgroundColor: alpha(ink, 0.12),
      borderBottomWidth: 4,
      borderBottomColor: alpha(ink, 0.18),
      alignItems: 'center',
      justifyContent: 'center',
      opacity: pressed ? 0.75 : 1,
      transform: [{ translateY: pressed ? 2 : 0 }],
    })}
  >
    <AppText style={{ color: ink, fontFamily: fonts.black, fontSize: 17 }}>Back</AppText>
  </Pressable>
);

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { session, markOnboarded } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [phase, setPhase] = useState<Phase>('steps');
  const [palette, setPalette] = useState<Palette>(SCREEN.health);
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [focus, setFocus] = useState<OnboardingFocus>('health');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [authOrigin, setAuthOrigin] = useState({ x: width / 2, y: height / 2 });

  const wipeScale = useSharedValue(0);
  const [wipeColor, setWipeColor] = useState(SCREEN.health.bg);
  const [wipeOrigin, setWipeOrigin] = useState({ x: width / 2, y: height * 0.8 });

  const ageNumber = numberOrNull(age) ?? 0;
  const detailsValid =
    firstName.trim().length > 0 && ageNumber >= 13 && ageNumber <= 100 && gender !== null;
  const canContinue = step === 2 ? detailsValid : true;

  const progress: [number, number, number] =
    step === 1
      ? [0.78, 0.62, 0.5]
      : step === 2
        ? [firstName.trim() ? 1 : 0.1, ageNumber > 0 ? 1 : 0.1, gender ? 1 : 0.1]
        : [1, 1, 1];

  useEffect(() => {
    let mounted = true;
    void readOnboardingDraft().then((draft) => {
      if (!mounted || !draft) return;
      setFirstName(draft.firstName);
      setAge(String(draft.age));
      setGender(draft.gender);
      setHeightCm(draft.heightCm ? String(draft.heightCm) : '');
      setWeightKg(draft.weightKg ? String(draft.weightKg) : '');
      setFocus(draft.focus);
      setGoal(draft.goal);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const commitColor = useCallback(
    (next: Palette) => {
      setPalette(next);
      setWiping(false);
      wipeScale.value = 0;
    },
    [wipeScale],
  );

  const changeColor = (next: Palette, event?: GestureResponderEvent) => {
    if (next.bg === palette.bg) {
      setPalette(next);
      return;
    }
    if (wiping) return;
    const point = event?.nativeEvent
      ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
      : { x: width / 2, y: height * 0.78 };
    setWipeColor(next.bg);
    setWipeOrigin(point);
    setWiping(true);
    wipeScale.value = 0;
    wipeScale.value = withTiming(
      1,
      { duration: 720, easing: Easing.bezier(0.55, 0, 0.2, 1) },
      (finished) => {
        if (finished) runOnJS(commitColor)(next);
      },
    );
  };

  const go = (next: Step, event?: GestureResponderEvent) => {
    setError(null);
    setStep(next);
    changeColor(colorFor(next, focus), event);
  };

  const buildDraft = (): OnboardingDraft => ({
    version: 1,
    firstName: firstName.trim(),
    age: ageNumber,
    gender,
    heightCm: numberOrNull(heightCm),
    weightKg: numberOrNull(weightKg),
    focus,
    goal: goal.trim(),
    completedAt: new Date().toISOString(),
  });

  const finish = async () => {
    if (!detailsValid) {
      setError('Add your name, age and gender to continue.');
      setStep(2);
      return;
    }

    const draft = buildDraft();
    const userId = session?.user?.id;

    if (userId) {
      setSaving(true);
      setError(null);
      try {
        await applyOnboardingDraft(userId, draft);
        await markOnboarded(true);
        router.replace('/(tabs)' as never);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not save your answers.');
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveOnboardingDraft(draft);
      setSaving(false);
      setPhase('done');
    } catch {
      setError('Could not keep your answers on this phone. Try again.');
      setSaving(false);
    }
  };

  const next = (event: GestureResponderEvent) => {
    if (step < 3) {
      if (step === 2 && !detailsValid) {
        setError('Add your name, age and gender to continue.');
        return;
      }
      go((step + 1) as Step, event);
      return;
    }
    void finish();
  };

  const chooseFocus = (value: OnboardingFocus) => {
    setFocus(value);
  };

  const replay = () => {
    setPhase('steps');
    setStep(1);
    setPalette(SCREEN.health);
    setError(null);
    wipeScale.value = 0;
  };

  const openAuth = () => {
    setAuthOrigin({ x: width / 2, y: height / 2 });
    setPhase('auth');
  };

  const wipeSize = Math.max(width, height) * 2.6;
  const wipeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: wipeOrigin.x - wipeSize / 2 },
      { translateY: wipeOrigin.y - wipeSize / 2 },
      { scale: wipeScale.value },
    ],
  }));

  if (phase === 'auth') {
    return (
      <View style={{ flex: 1, backgroundColor: BLACK }}>
        <StatusBar style="light" />
        <OnboardingAuth
          firstName={firstName.trim()}
          origin={authOrigin}
          onLogin={() => router.replace('/sign-in')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, overflow: 'hidden' }}>
      <StatusBar style={phase === 'done' ? 'light' : 'dark'} />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: wipeSize,
            height: wipeSize,
            borderRadius: wipeSize / 2,
            backgroundColor: wipeColor,
            zIndex: 40,
          },
          wipeStyle,
        ]}
      />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <OnboardingRings step={step} progress={progress} ink={palette.ink} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 22, paddingTop: 20, zIndex: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText
                  style={{
                    color: palette.ink,
                    fontFamily: fonts.black,
                    fontSize: 30,
                    letterSpacing: -0.8,
                  }}
                >
                  Auxo.
                </AppText>
                <AppText
                  style={{
                    color: alpha(palette.ink, 0.8),
                    fontFamily: fonts.semibold,
                    fontSize: 13,
                    letterSpacing: 0.4,
                  }}
                >
                  {`Step ${step} of 3`}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                {[1, 2, 3].map((index) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: alpha(palette.ink, 0.17),
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: index <= step ? '100%' : '0%',
                        height: '100%',
                        borderRadius: 6,
                        backgroundColor: palette.ink,
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 22,
                paddingTop: step === 1 ? 30 : 22,
                paddingBottom: 18,
              }}
            >
              {step === 1 ? (
                <View>
                  <Reveal index={0}>
                    <AppText
                      style={{
                        color: palette.ink,
                        fontFamily: fonts.black,
                        fontSize: 60,
                        lineHeight: 60,
                        letterSpacing: -2.8,
                      }}
                    >
                      Welcome
                    </AppText>
                    <AppText
                      style={{
                        color: alpha(palette.ink, 0.65),
                        fontFamily: fonts.medium,
                        fontSize: 15,
                        marginTop: 6,
                      }}
                    >
                      Three pillars, one reading.
                    </AppText>
                  </Reveal>
                  <Reveal index={1} delay={60}>
                    <AppText
                      style={{
                        color: palette.ink,
                        fontFamily: fonts.medium,
                        fontSize: 18,
                        lineHeight: 27,
                        marginTop: 22,
                      }}
                    >
                      Auxo brings sleep, money and the people around you into one reading — three
                      rings that tell you where you stand today, and what would move it most.
                    </AppText>
                  </Reveal>
                  {FOCUS.map((option, index) => (
                    <Reveal key={option.value} index={index + 2} delay={80}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
                        <AppText
                          style={{
                            width: 52,
                            color: palette.ink,
                            fontFamily: fonts.black,
                            fontSize: 32,
                            lineHeight: 32,
                            letterSpacing: -1.4,
                          }}
                        >
                          {option.number}
                        </AppText>
                        <View style={{ flex: 1 }}>
                          <AppText style={{ color: palette.ink, fontFamily: fonts.bold, fontSize: 17 }}>
                            {option.label}
                          </AppText>
                          <AppText
                            style={{
                              color: alpha(palette.ink, 0.65),
                              fontFamily: fonts.regular,
                              fontSize: 14,
                            }}
                          >
                            {option.caption}
                          </AppText>
                        </View>
                      </View>
                    </Reveal>
                  ))}
                  <Reveal index={5} delay={160}>
                    <AppText
                      style={{
                        color: alpha(palette.ink, 0.65),
                        fontFamily: fonts.regular,
                        fontSize: 13,
                        lineHeight: 19,
                        marginTop: 18,
                      }}
                    >
                      Takes about a minute. Your entries stay private to your account.
                    </AppText>
                  </Reveal>
                </View>
              ) : null}

              {step === 2 ? (
                <View>
                  <Reveal index={0}>
                    <AppText
                      style={{
                        color: palette.ink,
                        fontFamily: fonts.black,
                        fontSize: 46,
                        lineHeight: 47,
                        letterSpacing: -2,
                      }}
                    >
                      Your details
                    </AppText>
                    <AppText
                      style={{
                        color: alpha(palette.ink, 0.65),
                        fontFamily: fonts.medium,
                        fontSize: 15,
                        marginTop: 6,
                      }}
                    >
                      Name, age and gender.
                    </AppText>
                  </Reveal>
                  <View style={{ height: 22 }} />
                  <Reveal index={1} delay={60}>
                    <Field
                      label="First name"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="e.g. Alex"
                      autoCapitalize="words"
                      autoComplete="given-name"
                      ink={palette.ink}
                      accent={palette.ink}
                    />
                  </Reveal>
                  <Reveal index={2} delay={100}>
                    <Field
                      label="Age"
                      value={age}
                      onChangeText={setAge}
                      placeholder="e.g. 28"
                      keyboardType="number-pad"
                      maxLength={3}
                      ink={palette.ink}
                      accent={palette.ink}
                    />
                  </Reveal>
                  <Reveal index={3} delay={140}>
                    <View style={{ marginBottom: 18 }}>
                      <AppText
                        style={{
                          color: alpha(palette.ink, 0.65),
                          fontFamily: fonts.semibold,
                          fontSize: 11,
                          letterSpacing: 1.3,
                          textTransform: 'uppercase',
                          marginBottom: 8,
                        }}
                      >
                        Gender
                      </AppText>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {GENDERS.map((option) => {
                          const selected = gender === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              accessibilityRole="radio"
                              accessibilityState={{ selected }}
                              onPress={() => setGender(option.value)}
                              style={({ pressed }) => ({
                                height: 48,
                                paddingHorizontal: 22,
                                borderRadius: 24,
                                borderWidth: 2,
                                borderBottomWidth: 4,
                                borderColor: selected ? palette.ink : alpha(palette.ink, 0.25),
                                backgroundColor: selected ? palette.ink : alpha(palette.ink, 0.08),
                                justifyContent: 'center',
                                opacity: pressed ? 0.75 : 1,
                              })}
                            >
                              <AppText
                                style={{
                                  color: selected ? palette.bg : palette.ink,
                                  fontFamily: fonts.semibold,
                                  fontSize: 16,
                                }}
                              >
                                {option.label}
                              </AppText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </Reveal>
                  <Reveal index={4} delay={180}>
                    <View style={{ flexDirection: 'row', gap: 20 }}>
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Height (cm, optional)"
                          value={heightCm}
                          onChangeText={setHeightCm}
                          placeholder="170"
                          keyboardType="decimal-pad"
                          maxLength={5}
                          ink={palette.ink}
                          accent={palette.ink}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Weight (kg, optional)"
                          value={weightKg}
                          onChangeText={setWeightKg}
                          placeholder="65"
                          keyboardType="decimal-pad"
                          maxLength={5}
                          ink={palette.ink}
                          accent={palette.ink}
                        />
                      </View>
                    </View>
                  </Reveal>
                  <Reveal index={5} delay={220}>
                    <AppText
                      style={{
                        color: alpha(palette.ink, 0.65),
                        fontFamily: fonts.regular,
                        fontSize: 13,
                        lineHeight: 19,
                      }}
                    >
                      Height and weight sharpen your calorie and protein targets. You can add them
                      later in Profile.
                    </AppText>
                  </Reveal>
                </View>
              ) : null}

              {step === 3 ? (
                <View>
                  <Reveal index={0}>
                    <AppText
                      style={{
                        color: palette.ink,
                        fontFamily: fonts.black,
                        fontSize: 46,
                        lineHeight: 47,
                        letterSpacing: -2,
                      }}
                    >
                      Your focus
                    </AppText>
                    <AppText
                      style={{
                        color: alpha(palette.ink, 0.65),
                        fontFamily: fonts.medium,
                        fontSize: 15,
                        marginTop: 6,
                      }}
                    >
                      Choose where to start.
                    </AppText>
                  </Reveal>
                  <View style={{ height: 24 }} />
                  {FOCUS.map((option, index) => {
                    const selected = focus === option.value;
                    return (
                      <Reveal key={option.value} index={index + 1} delay={70}>
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          onPress={() => chooseFocus(option.value)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 14,
                            minHeight: 72,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderRadius: 22,
                            borderWidth: 2,
                            borderBottomWidth: 5,
                            borderColor: selected ? palette.ink : alpha(palette.ink, 0.22),
                            backgroundColor: selected ? palette.ink : alpha(palette.ink, 0.07),
                            marginBottom: 12,
                            opacity: pressed ? 0.82 : 1,
                          })}
                        >
                          <AppText
                            style={{
                              width: 52,
                              color: selected ? palette.bg : palette.ink,
                              fontFamily: fonts.black,
                              fontSize: 32,
                              lineHeight: 32,
                              letterSpacing: -1.4,
                            }}
                          >
                            {option.number}
                          </AppText>
                          <View style={{ flex: 1 }}>
                            <AppText
                              style={{
                                color: selected ? palette.bg : palette.ink,
                                fontFamily: fonts.semibold,
                                fontSize: 17,
                              }}
                            >
                              {option.label}
                            </AppText>
                            <AppText
                              style={{
                                color: selected
                                  ? alpha(palette.bg, 0.72)
                                  : alpha(palette.ink, 0.65),
                                fontFamily: fonts.regular,
                                fontSize: 14,
                              }}
                            >
                              {option.caption}
                            </AppText>
                          </View>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: selected ? palette.bg : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transform: [{ scale: selected ? 1 : 0 }],
                            }}
                          >
                            <Icon name="check" size={15} color={palette.ink} />
                          </View>
                        </Pressable>
                      </Reveal>
                    );
                  })}
                  <Reveal index={4} delay={140}>
                    <AppText
                      style={{
                        color: alpha(palette.ink, 0.65),
                        fontFamily: fonts.semibold,
                        fontSize: 11,
                        letterSpacing: 1.3,
                        textTransform: 'uppercase',
                        marginTop: 8,
                        marginBottom: 4,
                      }}
                    >
                      A goal, in your own words (optional)
                    </AppText>
                    <TextInput
                      value={goal}
                      onChangeText={setGoal}
                      placeholder="e.g. Sleep seven hours and save 200 a month"
                      placeholderTextColor={alpha(palette.ink, 0.4)}
                      multiline
                      maxLength={200}
                      style={{
                        minHeight: 66,
                        color: palette.ink,
                        fontFamily: fonts.medium,
                        fontSize: 18,
                        borderBottomWidth: 2,
                        borderBottomColor: alpha(palette.ink, 0.3),
                        paddingTop: 8,
                        paddingBottom: 10,
                        textAlignVertical: 'top',
                      }}
                    />
                  </Reveal>
                </View>
              ) : null}
            </ScrollView>

            {error ? (
              <AppText
                style={{
                  color: palette.ink,
                  fontFamily: fonts.medium,
                  fontSize: 13,
                  lineHeight: 18,
                  paddingHorizontal: 22,
                  paddingBottom: 4,
                }}
              >
                {error}
              </AppText>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 22,
                paddingTop: 12,
                paddingBottom: Math.max(insets.bottom + 12, 24),
                zIndex: 2,
              }}
            >
              {step > 1 ? (
                <BackPill ink={palette.ink} onPress={(event) => go((step - 1) as Step, event)} />
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canContinue || saving || wiping }}
                disabled={!canContinue || saving || wiping}
                onPress={next}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 62,
                  borderRadius: 31,
                  borderBottomWidth: 5,
                  borderBottomColor: alpha(palette.ink, 0.78),
                  backgroundColor: canContinue ? palette.ink : alpha(palette.ink, 0.12),
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed && canContinue ? 0.86 : 1,
                  transform: [{ translateY: pressed && canContinue ? 3 : 0 }],
                })}
              >
                {saving ? (
                  <ActivityIndicator color={palette.bg} />
                ) : (
                  <AppText
                    style={{
                      color: canContinue ? palette.bg : alpha(palette.ink, 0.4),
                      fontFamily: fonts.black,
                      fontSize: 18,
                      letterSpacing: -0.2,
                    }}
                  >
                    {step === 1 ? 'Get started' : step === 2 ? 'Continue' : 'Start using Auxo'}
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {phase === 'done' ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 60,
            backgroundColor: BLACK,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <CompletionRings size={220} colors={[LIME, AMBER, BLUE]} />
          <AppText
            style={{
              color: '#F4F4F2',
              fontFamily: fonts.black,
              fontSize: 38,
              lineHeight: 41,
              letterSpacing: -1.6,
              textAlign: 'center',
              marginTop: 26,
            }}
          >
            {firstName.trim() ? `You’re all set, ${firstName.trim()}` : 'You’re all set'}
          </AppText>
          <AppText
            style={{
              color: '#A3A3A0',
              fontFamily: fonts.regular,
              fontSize: 15,
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 26,
            }}
          >
            Your three rings are ready.
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={openAuth}
            style={({ pressed }) => ({
              width: '100%',
              maxWidth: 300,
              height: 62,
              borderRadius: 31,
              backgroundColor: LIME,
              borderBottomWidth: 5,
              borderBottomColor: '#8FAE22',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateY: pressed ? 3 : 0 }],
            })}
          >
            <AppText style={{ color: '#17220A', fontFamily: fonts.black, fontSize: 18 }}>
              Continue
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={replay}
            hitSlop={10}
            style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}
          >
            <AppText
              style={{
                color: '#A3A3A0',
                fontFamily: fonts.medium,
                fontSize: 15,
                textDecorationLine: 'underline',
              }}
            >
              Replay
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
