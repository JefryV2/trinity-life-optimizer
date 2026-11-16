import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/wordmark';
import { BackLink } from '@/components/ui/back-link';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { TextField } from '@/components/ui/text-field';
import { SocialSignIn } from '@/features/auth/social-sign-in';
import { useAuth } from '@/providers/auth-provider';
import { radius, space, useTheme } from '@/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async () => {
    if (!firstName.trim()) {
      setError('Enter your first name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const hasSession = await signUp(email, password, firstName);
      if (hasSession) {
        router.replace('/onboarding');
      } else {
        setCheckEmail(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkEmail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
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
          <Wordmark height={28} />
          <PageHeader
            title="Check your email"
            subtitle={`We sent a confirmation link to ${email.trim()}. Open it on this device, then sign in.`}
          />
          <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            gap: space.xxl,
            maxWidth: 520,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <BackLink />
          <View style={{ gap: space.xl }}>
            <Wordmark height={30} />
            <PageHeader title="Create your account" />
          </View>

          <View style={{ gap: space.lg }}>
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
            {socialError ? (
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
                  {socialError}
                </AppText>
              </View>
            ) : null}
            <SocialSignIn
              onError={setSocialError}
              disabled={submitting}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
              <AppText variant="mono" tone="tertiary">
                or sign up with email
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
            </View>
          </View>

          <View style={{ gap: space.lg }}>
            <TextField
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Your first name"
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
            />
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button
              label="Create account"
              onPress={submit}
              loading={submitting}
              disabled={submitting}
            />
            <AppText variant="footnote" tone="tertiary" style={{ textAlign: 'center' }}>
              By creating an account you agree to the{' '}
              <AppText variant="footnote" tone="primary" onPress={() => router.push('/legal?tab=terms' as never)}>
                Terms
              </AppText>{' '}
              and{' '}
              <AppText variant="footnote" tone="primary" onPress={() => router.push('/legal?tab=privacy' as never)}>
                Privacy Notice
              </AppText>
              .
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/sign-in')}
            hitSlop={12}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <AppText variant="footnote" tone="secondary">
              Already have an account?{' '}
              <AppText variant="footnote" tone="primary">
                Sign in
              </AppText>
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
