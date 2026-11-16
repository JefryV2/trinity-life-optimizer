import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { completeOAuthFromUrl, OAUTH_REDIRECT } from '@/lib/oauth';
import { initNhost } from '@/lib/nhost';
import { useAuth } from '@/providers/auth-provider';
import { space, useTheme } from '@/theme';

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const callbackUrl = (params: Record<string, string | string[] | undefined>) => {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&');
  return query ? `${OAUTH_REDIRECT}?${query}` : OAUTH_REDIRECT;
};

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    errorDescription?: string;
  }>();
  const { session } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const code = one(params.code);
  const oauthError = one(params.error);
  const description = one(params.error_description ?? params.errorDescription);

  useEffect(() => {
    let mounted = true;

    const finish = async () => {
      if (session) {
        if (mounted) setFinished(true);
        return;
      }

      try {
        const client = await initNhost();
        await completeOAuthFromUrl(
          client,
          callbackUrl({
            code,
            error: oauthError,
            error_description: description,
          }),
        );
        if (mounted) setFinished(true);
      } catch (caught) {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : 'Sign-in could not be completed.');
        }
      }
    };

    void finish();
    return () => {
      mounted = false;
    };
  }, [session, code, oauthError, description]);

  useEffect(() => {
    if (finished) router.replace('/');
  }, [finished, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.xxl,
          gap: space.lg,
        }}
      >
        {error ? (
          <>
            <AppText variant="headline" style={{ textAlign: 'center' }}>
              Could not finish signing in
            </AppText>
            <AppText variant="footnote" tone="secondary" style={{ textAlign: 'center' }}>
              {error}
            </AppText>
            <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="callout" tone="secondary">
              Finishing sign-in…
            </AppText>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
