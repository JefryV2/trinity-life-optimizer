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
import { radius, space, useTheme } from '@/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setSubmitting(true);
    setError(null);
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
            gap: space.xxl,
            maxWidth: 520,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <View style={{ gap: space.lg }}>
            <BrandMark size={68} />
            <View style={{ gap: space.sm }}>
              <AppText variant="hero">Welcome back</AppText>
              <AppText variant="body" tone="secondary">
                Your health, money and relationships — read together, not in separate apps.
              </AppText>
            </View>
          </View>

          <Card style={{ gap: space.lg }}>
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
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={error}
            />
            <Button
              label="Sign in"
              onPress={submit}
              loading={submitting}
              disabled={submitting}
            />
          </Card>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/sign-up')}
            hitSlop={12}
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText variant="footnote" tone="secondary">
              New to Trinity?{' '}
              <AppText variant="footnote" style={{ color: colors.primary, fontWeight: '600' }}>
                Create an account
              </AppText>
            </AppText>
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
              }}
            />
            <AppText variant="caption" tone="tertiary">
              Private by default · your records stay yours
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
