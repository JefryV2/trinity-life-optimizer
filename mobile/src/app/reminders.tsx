import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Switch } from '@/components/ui/switch';
import { useReminders } from '@/features/reminders/use-reminders';
import { formatStamp } from '@/lib/format';
import { space } from '@/theme';

const HOURS = [18, 19, 20, 21].map((hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));

export default function RemindersScreen() {
  const reminders = useReminders();

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <BackLink />
      <PageHeader title="Reminders" date={formatStamp()} />

      <SectionHeader title="Daily rhythm" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingVertical: space.md,
            minHeight: 60,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="callout">Evening check-in</AppText>
            <AppText variant="footnote" tone="tertiary">
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
          <View style={{ gap: space.sm, paddingBottom: space.md }}>
            <AppText variant="caption" tone="tertiary">
              TIME
            </AppText>
            <Chips
              options={HOURS}
              value={String(reminders.hour)}
              onChange={(value) => void reminders.setHour(Number(value))}
            />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Weekly" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingVertical: space.md,
            minHeight: 60,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="callout">Sunday review</AppText>
            <AppText variant="footnote" tone="tertiary">
              Sunday at 18:00, after the week has happened.
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Sunday weekly review reminder"
            value={reminders.weekly}
            onValueChange={(value) => void reminders.toggleWeekly(value)}
          />
        </View>
      </Card>

      {reminders.message ? (
        <AppText variant="footnote" tone="secondary">
          {reminders.message}
        </AppText>
      ) : null}

      <Button
        label="Send a test notification"
        variant="secondary"
        onPress={() => void reminders.test()}
      />

      <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 19 }}>
        Auxo only schedules local notifications. Nothing is sent to a server to remind you.
      </AppText>
    </Screen>
  );
}
