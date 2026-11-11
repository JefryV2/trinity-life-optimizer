import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useProfile } from '@/features/profile/use-profile';
import { formatStamp, initials } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { radius, space, useTheme } from '@/theme';

export default function MoreScreen() {
  const { signOut, demo, resetDemo, markOnboarded } = useAuth();
  const { colors } = useTheme();
  const { data } = useProfile();
  const queryClient = useQueryClient();
  const profile = data?.profile;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Trinity member';

  const confirmSignOut = () => {
    Alert.alert(
      demo ? 'Leave the demo?' : 'Sign out?',
      demo
        ? 'You will return to the sign-in screen. Demo data stays on this device.'
        : 'You can sign back in with the same account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: demo ? 'Leave demo' : 'Sign out',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ],
    );
  };

  const testOnboarding = async () => {
    await markOnboarded(false);
    router.replace('/onboarding' as never);
  };

  const confirmReset = () => {
    Alert.alert('Reset demo data?', 'Every sample record returns to its original state.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await resetDemo();
            await queryClient.invalidateQueries();
          })();
        },
      },
    ]);
  };

  return (
    <Screen>
      <PageHeader title="More" date={formatStamp()} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="callout" tone="secondary">
            {initials(profile?.first_name, profile?.last_name)}
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="headline">{name}</AppText>
          <AppText variant="footnote" tone="secondary">
            {demo ? 'Demo mode · offline sample data' : `${profile?.tier ?? 'personal'} plan`}
          </AppText>
        </View>
      </View>

      <SectionHeader title="Explore" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="chart" title="Insights" subtitle="Trends and correlations" onPress={() => router.push('/insights')} />
        <ListRow icon="calendar" title="Progress calendar" subtitle="Daily pillar scores" onPress={() => router.push('/calendar')} />
        <ListRow icon="water" title="Hydration" subtitle="Water tracker and reminders" onPress={() => router.push('/hydration')} last />
      </Card>

      <SectionHeader title="Account" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="user" title="Profile" subtitle="Name, body metrics, calorie target" onPress={() => router.push('/profile')} />
        <ListRow icon="settings" title="Feature preferences" subtitle="Choose what to track" onPress={() => router.push('/profile/preferences')} />
        <ListRow icon="trophy" title="Achievements" subtitle="Milestones from your records" onPress={() => router.push('/profile/achievements')} />
        <ListRow icon="logout" title={demo ? 'Leave demo' : 'Sign out'} destructive onPress={confirmSignOut} chevron={false} last />
      </Card>

      {demo ? (
        <>
          <SectionHeader title="Demo mode" />
          <Card padded={false} style={{ paddingHorizontal: space.lg }}>
            <ListRow
              icon="user"
              title="Test onboarding"
              subtitle="Walk the five-page setup flow again with demo data"
              onPress={() => void testOnboarding()}
            />
            <ListRow
              icon="note"
              title="Reset demo data"
              subtitle="Restore the original sample records"
              onPress={confirmReset}
              chevron={false}
              last
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
