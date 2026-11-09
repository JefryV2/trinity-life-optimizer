import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/providers/auth-provider';
import { space, useTheme } from '@/theme';

export default function Index() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.lg,
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
        <AppText variant="footnote" tone="secondary">
          Opening Trinity…
        </AppText>
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;

  const onboarded = session.user.user_metadata?.onboarding_completed === true;
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
