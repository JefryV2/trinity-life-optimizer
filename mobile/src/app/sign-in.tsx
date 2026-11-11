import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { radius, space, useTheme } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signin' | 'reset';

export default function SignInScreen() {
  const { signIn, resetPassword, enterDemo } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const startDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      await enterDemo();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start the demo.');
    } finally {
      setDemoLoading(false);
    }
  };

  const submit = async () => {
    setError(null);
    setNotice(null);

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('That email address does not look right.');
      return;
    }

    if (mode === 'reset') {
      setSubmitting(true);
      try {
        await resetPassword(email);
        setNotice('If an account exists for that address, a reset link is on its way.');
        setMode('signin');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not send the reset link.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 6) {
      setError('Passwords are at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      // The root guard sends signed-in users to onboarding or the tabs.
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: space.xxl,
            gap: space.xl,
            maxWidth: 520,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <View style={{ gap: space.lg }}>
            <BrandMark size={44} />
            <PageHeader
              title={mode === 'signin' ? 'Sign in' : 'Reset password'}
              subtitle={
                mode === 'signin'
                  ? 'Health, money and relationships, tracked in one place.'
                  : 'We will email you a link to set a new password.'
              }
            />
          </View>

          {notice ? (
            <View
              style={{
                borderRadius: radius.inner,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: space.md,
              }}
            >
              <AppText variant="footnote" tone="secondary">
                {notice}
              </AppText>
            </View>
          ) : null}

          {error ? (
            <View
              style={{
                borderRadius: radius.inner,
                borderWidth: 1,
                borderColor: colors.danger,
                backgroundColor: colors.surface,
                padding: space.md,
              }}
            >
              <AppText variant="footnote" tone="danger" selectable>
                {error}
              </AppText>
            </View>
          ) : null}

          <View style={{ gap: space.lg }}>
            <TextField
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType={mode === 'signin' ? 'next' : 'go'}
              onSubmitEditing={mode === 'reset' ? submit : undefined}
            />

            {mode === 'signin' ? (
              <TextField
                label="Password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                placeholder="Your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            ) : null}

            <Button
              label={mode === 'signin' ? 'Sign in' : 'Send reset link'}
              onPress={submit}
              loading={submitting}
              disabled={submitting}
            />

            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                setMode(mode === 'signin' ? 'reset' : 'signin');
                setError(null);
                setNotice(null);
              }}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <AppText variant="footnote" tone="secondary">
                {mode === 'signin' ? 'Forgot your password?' : 'Back to sign in'}
              </AppText>
            </Pressable>
          </View>

          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
              <AppText variant="mono" tone="tertiary">
                or
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
            </View>

            <Button
              label="Explore the offline demo"
              variant="secondary"
              onPress={startDemo}
              loading={demoLoading}
              disabled={demoLoading}
            />
            <AppText variant="footnote" tone="tertiary">
              Sample data stays on this device. No account needed.
            </AppText>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/sign-up')}
              hitSlop={12}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <AppText variant="footnote" tone="secondary">
                New to Trinity?{' '}
                <AppText variant="footnote" tone="primary">
                  Create an account
                </AppText>
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
