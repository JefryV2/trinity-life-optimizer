import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useProfile } from '@/features/profile/use-profile';
import { formatStamp, initials } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { radius, space, useTheme } from '@/theme';

export default function MoreScreen() {
  const { signOut, demo, resetDemo, markOnboarded, deleteAccount } = useAuth();
  const { colors } = useTheme();
  const { data } = useProfile();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<'signout' | 'reset' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const profile = data?.profile;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Auxo member';

  const confirmSignOut = () => {
    setDialog('signout');
  };

  const testOnboarding = async () => {
    await markOnboarded(false);
    router.replace('/onboarding' as never);
  };

  const confirmReset = () => {
    setDialog('reset');
  };

  return (
    <Screen header={<PageHeader title="You" date={formatStamp()} rule={false} />}>
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

      <SectionHeader title="Review" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="book" title="Weekly review" subtitle="Your seven-day reading" onPress={() => router.push('/weekly-review' as never)} />
        <ListRow icon="chart" title="Insights" subtitle="Trends and correlations" onPress={() => router.push('/insights')} />
        <ListRow icon="calendar" title="Progress calendar" subtitle="Daily pillar scores" onPress={() => router.push('/calendar')} />
        <ListRow icon="trophy" title="Achievements" subtitle="Milestones from your records" onPress={() => router.push('/profile/achievements')} last />
      </Card>

      <SectionHeader title="Preferences" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="settings" title="Feature preferences" subtitle="Choose what to track" onPress={() => router.push('/profile/preferences')} />
        <ListRow icon="bell" title="Reminders" subtitle="Check-in and weekly review" onPress={() => router.push('/reminders' as never)} />
        <ListRow icon="scale" title="Units & currency" subtitle="How your data is shown" onPress={() => router.push('/settings' as never)} last />
      </Card>

      <SectionHeader title="Data" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="heart" title="Health import" subtitle="Health Connect and Apple Health" onPress={() => router.push('/health-import' as never)} />
        <ListRow icon="info" title="Data & privacy" subtitle="Export your records" onPress={() => router.push('/data-privacy' as never)} />
        <ListRow icon="lock" title="Legal & support" subtitle="Privacy, terms, contact" onPress={() => router.push('/legal' as never)} last />
      </Card>

      <SectionHeader title="Account" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <ListRow icon="user" title="Profile" subtitle="Name, body metrics, calorie target" onPress={() => router.push('/profile')} />
        {!demo ? (
          <ListRow
            icon="lock"
            title="Password"
            subtitle="Change your sign-in password"
            onPress={() => router.push('/account/password' as never)}
          />
        ) : null}
        {!demo ? (
          <ListRow
            icon="trash"
            title="Delete account"
            subtitle="Erase every record and your sign-in"
            destructive
            onPress={() => {
              setAccountError(null);
              setDialog('delete');
            }}
          />
        ) : null}
        <ListRow icon="logout" title={demo ? 'Leave demo' : 'Sign out'} destructive onPress={confirmSignOut} chevron={false} last />
      </Card>

      {accountError ? (
        <AppText variant="footnote" tone="danger" selectable>
          {accountError}
        </AppText>
      ) : null}

      {demo ? (
        <>
          <SectionHeader title="Demo mode" />
          <Card padded={false} style={{ paddingHorizontal: space.lg }}>
            <ListRow
              icon="user"
              title="Test onboarding"
              subtitle="Walk the setup flow again with demo data"
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

      <ConfirmDialog
        visible={dialog === 'signout'}
        title={demo ? 'Leave the demo?' : 'Sign out?'}
        message={
          demo
            ? 'You will return to the welcome screen. Demo data stays on this device.'
            : 'You can sign back in with the same account.'
        }
        confirmLabel={demo ? 'Leave demo' : 'Sign out'}
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          void (async () => {
            await signOut();
            queryClient.clear();
          })();
        }}
      />

      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Delete your account?"
        message="This permanently deletes every record, walk and score, and removes your sign-in. It cannot be undone."
        confirmLabel="Delete account"
        destructive
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDialog(null);
        }}
        onConfirm={() => {
          setDeleting(true);
          setAccountError(null);
          void (async () => {
            try {
              await deleteAccount();
              queryClient.clear();
              setDialog(null);
            } catch (caught) {
              setDeleting(false);
              setDialog(null);
              setAccountError(
                caught instanceof Error ? caught.message : 'Could not delete the account.',
              );
            }
          })();
        }}
      />

      <ConfirmDialog
        visible={dialog === 'reset'}
        title="Reset demo data?"
        message="Every sample record returns to its original state."
        confirmLabel="Reset"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          void (async () => {
            await resetDemo();
            await queryClient.invalidateQueries();
          })();
        }}
      />
    </Screen>
  );
}
