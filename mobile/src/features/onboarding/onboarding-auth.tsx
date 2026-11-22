import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppleMark } from '@/components/brand/apple-mark';
import { GoogleMark } from '@/components/brand/google-mark';
import { AppText } from '@/components/ui/app-text';
import { Reveal } from '@/components/ui/reveal';
import { useAuth } from '@/providers/auth-provider';
import { fonts, space } from '@/theme';

const APPLE_ENABLED =
  process.env.EXPO_PUBLIC_APPLE_SIGNIN === '1' && Platform.OS === 'ios';

const LIME = '#C6F24E';
const AMBER = '#FFB020';
const BLUE = '#6F9BFF';
const AUTH_BG = '#0A0A0A';

type AuthAction = {
  key: 'google' | 'apple' | 'email';
  label: string;
  color: string;
  ink: string;
  icon: React.ReactNode;
};

interface OnboardingAuthProps {
  firstName: string;
  /** Where the completion rings were, in window coordinates. */
  origin: { x: number; y: number };
  onLogin: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

const AuthPill = ({
  action,
  hidden,
  onPress,
  pillRef,
}: {
  action: AuthAction;
  hidden: boolean;
  onPress: () => void;
  pillRef: (node: Measurable | null) => void;
}) => {
  return (
    <View ref={pillRef as never} collapsable={false} style={{ opacity: hidden ? 0 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={onPress}
        style={({ pressed }) => ({
          height: 60,
          borderRadius: 30,
          borderBottomWidth: 5,
          borderBottomColor: 'rgba(0,0,0,0.28)',
          backgroundColor: action.color,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transform: [{ translateY: pressed ? 3 : 0 }],
          opacity: pressed ? 0.88 : 1,
        })}
      >
        {action.icon}
        <AppText
          style={{
            color: action.ink,
            fontFamily: fonts.black,
            fontSize: 17,
            letterSpacing: -0.2,
          }}
        >
          {action.label}
        </AppText>
      </Pressable>
    </View>
  );
};

const MorphBars = ({
  actions,
  origin,
  targets,
  onDone,
}: {
  actions: AuthAction[];
  origin: { x: number; y: number };
  targets: Array<Rect | null>;
  onDone: () => void;
}) => {
  const progress = useRef(actions.map(() => new Animated.Value(0))).current;
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const ready = targets.length === actions.length && targets.every(Boolean);
    if (!ready) return;
    started.current = true;
    const animations = progress.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 900,
        delay: index * 90,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        useNativeDriver: false,
      }),
    );
    Animated.parallel(animations).start(({ finished }) => {
      if (!finished) return;
      setDone(true);
      onDone();
    });
    // The animation is intentionally mounted once per auth screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.length, targets]);

  if (done) return null;

  return (
    <View pointerEvents="none" style={{ ...StyleSheetAbsoluteFill, zIndex: 90 }}>
      {actions.map((action, index) => {
        const target = targets[index];
        if (!target) return null;
        const size = Math.max(110, 210 - index * 46);
        const input = progress[index];
        const startLeft = origin.x - size / 2;
        const startTop = origin.y - size / 2;
        const left = input.interpolate({
          inputRange: [0, 1],
          outputRange: [startLeft, target.x],
        });
        const top = input.interpolate({
          inputRange: [0, 1],
          outputRange: [startTop, target.y],
        });
        const width = input.interpolate({
          inputRange: [0, 1],
          outputRange: [size, target.width],
        });
        const height = input.interpolate({
          inputRange: [0, 1],
          outputRange: [size, target.height - 5],
        });
        const borderWidth = input.interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [17, 7, 0],
        });
        const borderRadius = input.interpolate({
          inputRange: [0, 1],
          outputRange: [size / 2, 30],
        });
        const backgroundColor = input.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['rgba(0,0,0,0)', action.color, action.color],
        });
        return (
          <Animated.View
            key={action.key}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              borderWidth,
              borderColor: action.color,
              borderRadius,
              backgroundColor,
            }}
          />
        );
      })}
    </View>
  );
};

/** The auth step at the end of onboarding. The completion rings morph into the
 * three coloured provider pills, then the email form settles in underneath. */
export const OnboardingAuth = ({ firstName, origin, onLogin }: OnboardingAuthProps) => {
  const { signInWithProvider, signUp } = useAuth();
  const { height } = useWindowDimensions();
  const [targets, setTargets] = useState<Array<Rect | null>>([]);
  const [barsDone, setBarsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState<'google' | 'apple' | 'email' | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailMode, setEmailMode] = useState(false);

  const actions: AuthAction[] = [
    {
      key: 'google',
      label: 'Continue with Google',
      color: LIME,
      ink: '#17220A',
      icon: <GoogleMark size={19} />,
    },
    ...(APPLE_ENABLED
      ? [
          {
            key: 'apple' as const,
            label: 'Continue with Apple',
            color: AMBER,
            ink: '#2C1A00',
            icon: <AppleMark size={20} />,
          },
        ]
      : []),
    {
      key: 'email',
      label: 'Continue with email',
      color: BLUE,
      ink: '#0B1745',
      icon: <View style={{ width: 19 }} />,
    },
  ];

  const refs = useRef<Array<Measurable | null>>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      Promise.all(
        actions.map(
          (_, index) =>
            new Promise<Rect | null>((resolve) => {
              const node = refs.current[index];
              if (!node) {
                resolve(null);
                return;
              }
              node.measureInWindow((x, y, width, height) => {
                resolve({ x, y, width, height });
              });
            }),
        ),
      ).then((next) => {
        if (!cancelled) setTargets(next);
      });
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Measure once, after the auth panel has laid itself out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runProvider = async (provider: 'google' | 'apple') => {
    setError(null);
    setSubmitting(provider);
    try {
      await signInWithProvider(provider);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in could not be completed.');
    } finally {
      setSubmitting(null);
    }
  };

  const createAccount = async () => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    setSubmitting('email');
    try {
      const hasSession = await signUp(email, password, firstName);
      if (hasSession) {
        router.replace('/(tabs)' as never);
      } else {
        setCheckEmail(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the account.');
    } finally {
      setSubmitting(null);
    }
  };

  if (checkEmail) {
    return (
      <View style={{ flex: 1, backgroundColor: AUTH_BG, padding: space.xxl, justifyContent: 'center' }}>
        <AppText style={{ color: LIME, fontFamily: fonts.black, fontSize: 32 }}>Auxo.</AppText>
        <AppText
          style={{
            color: '#F4F4F2',
            fontFamily: fonts.black,
            fontSize: 42,
            lineHeight: 45,
            letterSpacing: -1.6,
            marginTop: 28,
          }}
        >
          Check your email
        </AppText>
        <AppText
          style={{
            color: '#A3A3A0',
            fontFamily: fonts.regular,
            fontSize: 16,
            lineHeight: 24,
            marginTop: 10,
          }}
        >
          {`We sent a confirmation link to ${email.trim()}. Open it on this device, then sign in.`}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/sign-in')}
          style={{
            height: 60,
            marginTop: 28,
            borderRadius: 30,
            backgroundColor: LIME,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ color: '#17220A', fontFamily: fonts.black, fontSize: 17 }}>
            Back to sign in
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: AUTH_BG }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingTop: 26,
            paddingBottom: 30,
          }}
        >
          <AppText style={{ color: LIME, fontFamily: fonts.black, fontSize: 30, letterSpacing: -0.6 }}>
            Auxo.
          </AppText>

          <View style={{ flex: 1, minHeight: Math.max(96, height * 0.13) }} />

          <AppText
            style={{
              color: '#F4F4F2',
              fontFamily: fonts.black,
              fontSize: 42,
              lineHeight: 45,
              letterSpacing: -1.7,
            }}
          >
            Save your reading
          </AppText>
          <AppText
            style={{
              color: '#A3A3A0',
              fontFamily: fonts.regular,
              fontSize: 16,
              lineHeight: 23,
              marginTop: 9,
              marginBottom: 22,
            }}
          >
            Create an account so your rings follow you to any phone.
          </AppText>

          <View style={{ gap: 11 }}>
            {actions.map((action, index) => (
              <AuthPill
                key={action.key}
                action={action}
                hidden={!barsDone}
                pillRef={(node) => {
                  refs.current[index] = node;
                }}
                onPress={() => {
                  if (action.key === 'email') {
                    setEmailMode(true);
                    return;
                  }
                  void runProvider(action.key);
                }}
              />
            ))}
          </View>

          {barsDone ? (
            <Reveal delay={40}>
            <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
              <AppText style={{ color: '#8A8A92', fontFamily: fonts.medium, fontSize: 13 }}>or</AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
            </View>

            <View style={{ gap: 16, marginTop: 16 }}>
              <View>
                <AppText
                  style={{
                    color: '#8A8A92',
                    fontFamily: fonts.semibold,
                    fontSize: 11,
                    letterSpacing: 1.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Email
                </AppText>
                <TextInput
                  autoFocus={emailMode}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setError(null);
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="you@example.com"
                  placeholderTextColor="#55554F"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  style={{
                    minHeight: 48,
                    borderBottomWidth: 2,
                    borderBottomColor: emailFocused ? LIME : '#262626',
                    color: '#F4F4F2',
                    fontFamily: fonts.medium,
                    fontSize: 20,
                    paddingVertical: 8,
                  }}
                />
              </View>

              <View>
                <AppText
                  style={{
                    color: '#8A8A92',
                    fontFamily: fonts.semibold,
                    fontSize: 11,
                    letterSpacing: 1.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Password
                </AppText>
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError(null);
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#55554F"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  style={{
                    minHeight: 48,
                    borderBottomWidth: 2,
                    borderBottomColor: passwordFocused ? LIME : '#262626',
                    color: '#F4F4F2',
                    fontFamily: fonts.medium,
                    fontSize: 20,
                    paddingVertical: 8,
                  }}
                />
              </View>
            </View>

            {error ? (
              <AppText
                style={{
                  color: '#FF6B5A',
                  fontFamily: fonts.medium,
                  fontSize: 13,
                  lineHeight: 18,
                  marginTop: 12,
                }}
              >
                {error}
              </AppText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: submitting === 'email', disabled: submitting !== null }}
              disabled={submitting !== null}
              onPress={() => void createAccount()}
              style={({ pressed }) => ({
                height: 60,
                borderRadius: 30,
                borderBottomWidth: 5,
                borderBottomColor: '#8FAE22',
                backgroundColor: LIME,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
                transform: [{ translateY: pressed ? 3 : 0 }],
                opacity: submitting === 'email' ? 0.7 : 1,
              })}
            >
              {submitting === 'email' ? (
                <ActivityIndicator color="#17220A" />
              ) : (
                <AppText style={{ color: '#17220A', fontFamily: fonts.black, fontSize: 18 }}>
                  Create account
                </AppText>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onLogin}
              hitSlop={8}
              style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
            >
              <AppText style={{ color: '#A3A3A0', fontFamily: fonts.medium, fontSize: 14 }}>
                Already have an account?{' '}
                <AppText style={{ color: LIME, fontFamily: fonts.bold }}>Log in</AppText>
              </AppText>
            </Pressable>

            <AppText
              style={{
                color: '#6F6F72',
                fontFamily: fonts.regular,
                fontSize: 12,
                lineHeight: 17,
                textAlign: 'center',
                marginTop: 2,
              }}
            >
              {emailMode
                ? 'Your entries stay private to your account.'
                : 'Your first name and answers are saved when you create the account.'}
            </AppText>
            </Reveal>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {!barsDone ? (
        <MorphBars
          actions={actions}
          origin={origin}
          targets={targets}
          onDone={() => setBarsDone(true)}
        />
      ) : null}
    </View>
  );
};

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
