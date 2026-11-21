import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { useProfile } from '@/features/profile/use-profile';
import { formatStamp, initials } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { fonts, radius, space, useTheme } from '@/theme';

type YouTab = 'review' | 'settings' | 'data';

const TABS: Array<{ value: YouTab; label: string }> = [
  { value: 'review', label: 'Review' },
  { value: 'settings', label: 'Settings' },
  { value: 'data', label: 'Data' },
];

const YouAvatar = ({ label, progress }: { label: string; progress: number }) => {
  const { colors } = useTheme();
  const size = 58;
  const stroke = 4;
  const radiusValue = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const ratio = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - ratio * circumference}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View
        style={{
          width: size - 12,
          height: size - 12,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText style={{ fontFamily: fonts.bold, fontSize: 15 }}>{label}</AppText>
      </View>
    </View>
  );
};

const YouRow = ({
  icon,
  title,
  subtitle,
  onPress,
  destructive = false,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        minHeight: 64,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.separator,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={icon}
          size={20}
          color={destructive ? colors.danger : colors.textSecondary}
        />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText
          variant="callout"
          tone={destructive ? 'danger' : 'default'}
          style={{ fontWeight: '700' }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron" size={18} color={colors.textTertiary} />
    </Pressable>
  );
};

const ReviewCard = () => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Weekly review. Your seven-day reading"
      onPress={() => router.push('/weekly-review' as never)}
      style={({ pressed }) => ({
        backgroundColor: colors.primary,
        borderRadius: radius.group,
        padding: space.lg,
        minHeight: 204,
        overflow: 'hidden',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -76, right: -72, width: 240, height: 240 }}
      >
        {[240, 186, 132].map((size) => (
          <View
            key={size}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 1,
              borderColor: 'rgba(7,7,8,0.10)',
              right: (240 - size) / 2,
              top: (240 - size) / 2,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.pill,
            backgroundColor: colors.onPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="book" size={24} color={colors.primary} />
        </View>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.pill,
            backgroundColor: 'rgba(7,7,8,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevron" size={20} color={colors.onPrimary} />
        </View>
      </View>
      <View style={{ marginTop: 'auto', gap: 2 }}>
        <AppText
          style={{
            fontFamily: fonts.black,
            fontSize: 34,
            lineHeight: 38,
            letterSpacing: -1.4,
            color: colors.onPrimary,
          }}
        >
          Weekly review
        </AppText>
        <AppText style={{ fontFamily: fonts.medium, fontSize: 14, color: 'rgba(7,7,8,0.72)' }}>
          Your seven-day reading
        </AppText>
      </View>
    </Pressable>
  );
};

export default function MoreScreen() {
  const { signOut, demo, resetDemo, markOnboarded, deleteAccount } = useAuth();
  const { colors } = useTheme();
  const { data } = useProfile();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<YouTab>('review');
  const [dialog, setDialog] = useState<'signout' | 'reset' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const profile = data?.profile;
  const health = data?.health;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Auxo member';
  const completeness = Math.round(
    ([
      profile?.first_name,
      health?.birth_date,
      health?.height_cm,
      health?.weight_kg,
      health?.goal_type,
    ].filter(Boolean).length /
      5) *
      80,
  );

  const testOnboarding = async () => {
    await markOnboarded(false);
    router.replace('/onboarding' as never);
  };

  return (
    <Screen
      header={<PageHeader title="You" date={formatStamp()} rule={false} />}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}. Open profile`}
        onPress={() => router.push('/profile')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: space.sm,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <YouAvatar label={initials(profile?.first_name, profile?.last_name)} progress={completeness / 100} />
        <View style={{ flex: 1, gap: 1 }}>
          <AppText
            variant="headline"
            numberOfLines={1}
            style={{ fontSize: 23, lineHeight: 28, letterSpacing: -0.5 }}
          >
            {name}
          </AppText>
          <AppText variant="footnote" tone="secondary" numberOfLines={1}>
            {demo ? 'Demo mode · offline sample data' : `${profile?.tier ?? 'Personal'} plan`}
          </AppText>
        </View>
        <Icon name="chevron" size={22} color={colors.textTertiary} />
      </Pressable>

      <View
        accessibilityRole="tablist"
        accessibilityLabel="You sections"
        style={{
          flexDirection: 'row',
          padding: 4,
          gap: 2,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          marginTop: space.sm,
          marginBottom: space.lg,
        }}
      >
        {TABS.map((option) => {
          const selected = option.value === tab;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.primary : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText
                tone={selected ? 'onPrimary' : 'secondary'}
                style={{ fontFamily: fonts.bold, fontSize: 15 }}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {tab === 'review' ? (
        <View style={{ gap: space.lg }}>
          <ReviewCard />
          <View>
            <YouRow
              icon="chart"
              title="Insights"
              subtitle="Trends and correlations"
              onPress={() => router.push('/insights')}
            />
            <YouRow
              icon="calendar"
              title="Progress calendar"
              subtitle="Daily pillar scores"
              onPress={() => router.push('/calendar')}
            />
            <YouRow
              icon="trophy"
              title="Achievements"
              subtitle="Milestones from your records"
              onPress={() => router.push('/profile/achievements')}
              last
            />
          </View>
        </View>
      ) : null}

      {tab === 'settings' ? (
        <View>
          <YouRow
            icon="settings"
            title="Feature preferences"
            subtitle="Choose what to track"
            onPress={() => router.push('/profile/preferences')}
          />
          <YouRow
            icon="bell"
            title="Reminders"
            subtitle="Check-in and weekly review"
            onPress={() => router.push('/reminders' as never)}
          />
          <YouRow
            icon="scale"
            title="Units & currency"
            subtitle="How your data is shown"
            onPress={() => router.push('/settings' as never)}
          />
          <YouRow
            icon="user"
            title="Profile"
            subtitle="Name, body metrics, calorie target"
            onPress={() => router.push('/profile')}
          />
          {!demo ? (
            <YouRow
              icon="lock"
              title="Password"
              subtitle="Change your sign-in password"
              onPress={() => router.push('/account/password' as never)}
            />
          ) : null}
          {demo ? (
            <>
              <YouRow
                icon="user"
                title="Test onboarding"
                subtitle="Walk the setup flow again with demo data"
                onPress={() => void testOnboarding()}
              />
              <YouRow
                icon="note"
                title="Reset demo data"
                subtitle="Restore the original sample records"
                onPress={() => setDialog('reset')}
                last
              />
            </>
          ) : null}
        </View>
      ) : null}

      {tab === 'data' ? (
        <View>
          <YouRow
            icon="heart"
            title="Health import"
            subtitle="Health Connect and Apple Health"
            onPress={() => router.push('/health-import' as never)}
          />
          <YouRow
            icon="info"
            title="Data & privacy"
            subtitle="Export your records"
            onPress={() => router.push('/data-privacy' as never)}
          />
          <YouRow
            icon="lock"
            title="Legal & support"
            subtitle="Privacy, terms, contact"
            onPress={() => router.push('/legal' as never)}
          />
          {!demo ? (
            <YouRow
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
          <YouRow
            icon="logout"
            title={demo ? 'Leave demo' : 'Sign out'}
            subtitle={demo ? 'Return to the welcome screen' : 'You can sign back in later'}
            destructive
            onPress={() => setDialog('signout')}
            last
          />
          {accountError ? (
            <AppText variant="footnote" tone="danger" selectable style={{ marginTop: space.md }}>
              {accountError}
            </AppText>
          ) : null}
        </View>
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
