import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Switch } from '@/components/ui/switch';
import { useReminders } from '@/features/reminders/use-reminders';
import { formatStamp } from '@/lib/format';
import { fonts, radius, space, useTheme } from '@/theme';

const HOURS = [18, 19, 20, 21].map((hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));

export default function RemindersScreen() {
  const { colors } = useTheme();
  const reminders = useReminders();

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <PageHeader back="/(tabs)/more" title="Reminders" date={formatStamp()} rule={false} />

      <View style={{ marginTop: space.section * 5, gap: space.md }}>
        <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.inner,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText
              style={{
                fontFamily: fonts.black,
                fontSize: 25,
                lineHeight: 28,
                color: colors.onPrimary,
              }}
            >
              A
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <AppText variant="caption" tone="secondary">
              AUXO
            </AppText>
            <AppText variant="headline">Evening check-in</AppText>
            <AppText variant="footnote" tone="secondary">
              One small nudge to log the day.
            </AppText>
          </View>
          <AppText variant="mono" tone="tertiary">
            now
          </AppText>
        </Panel>
        <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
          SAMPLE · WHAT IT LOOKS LIKE
        </AppText>
      </View>

      <View
        style={{
          gap: space.sm,
          paddingTop: space.lg,
          borderTopWidth: 1,
          borderTopColor: colors.separator,
        }}
      >
        <AppText variant="caption" tone="primary">
          DAILY RHYTHM
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: fonts.black, fontSize: 27, lineHeight: 32 }}>
              Evening check-in
            </AppText>
            <AppText variant="footnote" tone="secondary">
              One small nudge to log the day.
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Evening check-in reminder"
            value={reminders.checkin}
            onValueChange={(value) => void reminders.toggleCheckin(value)}
          />
        </View>
        {reminders.checkin ? (
          <Chips
            options={HOURS}
            value={String(reminders.hour)}
            onChange={(value) => void reminders.setHour(Number(value))}
          />
        ) : null}
      </View>

      <View
        style={{
          gap: space.sm,
          paddingTop: space.lg,
          borderTopWidth: 1,
          borderTopColor: colors.separator,
        }}
      >
        <AppText variant="caption" tone="primary">
          WEEKLY
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: fonts.black, fontSize: 27, lineHeight: 32 }}>
              Sunday review
            </AppText>
            <AppText variant="footnote" tone="secondary">
              Sunday at 18:00, after the week has happened.
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Sunday weekly review reminder"
            value={reminders.weekly}
            onValueChange={(value) => void reminders.toggleWeekly(value)}
          />
        </View>
      </View>

      {reminders.message ? (
        <AppText variant="footnote" tone="secondary">
          {reminders.message}
        </AppText>
      ) : null}

      <Button label="Send a test notification" onPress={() => void reminders.test()} />

      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <Icon name="lock" size={16} color={colors.textTertiary} />
        <AppText variant="footnote" tone="tertiary" style={{ flex: 1, lineHeight: 19 }}>
          Auxo only schedules local notifications. Nothing is sent to a server to remind you.
        </AppText>
      </View>
    </Screen>
  );
}
