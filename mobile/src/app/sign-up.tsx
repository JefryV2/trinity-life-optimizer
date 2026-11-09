import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
      setError('Tell us your first name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
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
          <BrandMark size={60} />
          <View style={{ gap: space.sm }}>
            <AppText variant="title">Check your email</AppText>
            <AppText variant="body" tone="secondary">
              We sent a confirmation link to {email.trim()}. Open it on this device, then come back
              and sign in.
            </AppText>
          </View>
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
          <View style={{ gap: space.lg }}>
            <BrandMark size={68} />
            <View style={{ gap: space.sm }}>
              <AppText variant="hero">Start your Trinity</AppText>
              <AppText variant="body" tone="secondary">
                One place for the three things that compound: your body, your money, your people.
              </AppText>
            </View>
          </View>

          <Card style={{ gap: space.lg }}>
            <TextField
              label="FIRST NAME"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Yomna"
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
            />
            <TextField
              label="EMAIL"
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
              label="PASSWORD"
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
              helper="Stored by Supabase Auth, never in plain text."
            />
            <Button
              label="Create account"
              onPress={submit}
              loading={submitting}
              disabled={submitting}
            />
          </Card>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/sign-in')}
            hitSlop={12}
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText variant="footnote" tone="secondary">
              Already have an account?{' '}
              <AppText variant="footnote" style={{ color: colors.primary, fontWeight: '600' }}>
                Sign in
              </AppText>
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
