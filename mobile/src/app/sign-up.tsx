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
import { space, useTheme } from '@/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
          <BrandMark size={40} />
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
          <View style={{ gap: space.xl }}>
            <BrandMark size={44} />
            <PageHeader
              title="Create account"
              subtitle="One place for the three things that compound: your body, your money, your people."
            />
          </View>

          <View style={{ gap: space.lg }}>
            <TextField
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Yomna"
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
              error={error}
            />
            <Button
              label="Create account"
              onPress={submit}
              loading={submitting}
              disabled={submitting}
            />
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
