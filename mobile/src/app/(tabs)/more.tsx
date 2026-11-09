import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useProfile } from '@/features/profile/use-profile';
import { initials } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme';

export default function MoreScreen() {
  const { signOut, demo, resetDemo } = useAuth();
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
      <Card raised style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <BrandMark size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="headline">{name}</AppText>
          <AppText variant="footnote" tone="secondary">
            {demo
              ? 'Demo mode · offline sample data'
              : `${initials(profile?.first_name, profile?.last_name)} · ${profile?.tier ?? 'personal'} plan`}
          </AppText>
        </View>
      </Card>

      <SectionHeader title="Explore" caption="Cross-pillar views" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="chart" title="Insights" subtitle="Trends and correlations" onPress={() => router.push('/insights')} />
        <ListRow icon="calendar" title="Progress calendar" subtitle="Daily pillar scores" onPress={() => router.push('/calendar')} />
        <ListRow icon="water" title="Hydration" subtitle="Water tracker and reminders" onPress={() => router.push('/hydration')} last />
      </Card>

      <SectionHeader title="Account" caption="Profile and preferences" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="user" title="Profile" subtitle="Name, body metrics, calorie target" onPress={() => router.push('/profile')} />
        <ListRow icon="settings" title="Feature preferences" subtitle="Choose what to track" onPress={() => router.push('/profile/preferences')} />
        <ListRow icon="trophy" title="Achievements" subtitle="Milestones from your records" onPress={() => router.push('/profile/achievements')} />
        <ListRow icon="logout" title={demo ? 'Leave demo' : 'Sign out'} destructive onPress={confirmSignOut} last />
      </Card>

      {demo ? (
        <>
          <SectionHeader title="Demo mode" caption="Nothing leaves this device" />
          <Card padded={false} style={{ paddingHorizontal: space.lg }}>
            <ListRow
              icon="sparkles"
              title="Reset demo data"
              subtitle="Restore the original sample records"
              onPress={confirmReset}
              last
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
