import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { formatStamp, isoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { fonts, radius, space, useTheme } from '@/theme';

const TABLES = [
  'profiles',
  'user_profiles_health',
  'score_snapshots',
  'experiments',
  'sleep_records',
  'step_records',
  'exercise_records',
  'food_entries',
  'hydration_records',
  'mental_health_logs',
  'heart_rate_data',
  'uv_index_records',
  'health_goals',
  'health_goals_progress',
  'health_reminders',
  'menstrual_cycles',
  'womens_health_daily_logs',
  'health_daily_scores',
  'finance_accounts',
  'transactions',
  'budgets',
  'investments',
  'wealth_daily_scores',
  'wealth_goals_progress',
  'relationships',
  'interactions',
  'gratitude_entries',
  'quality_time_goals',
  'relations_daily_scores',
  'relations_goals_progress',
] as const;

const InfoPanel = ({
  icon,
  label,
  title,
  children,
  footer,
}: {
  icon: IconName;
  label: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <Panel style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceSunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={21} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="caption" tone="primary">
          {label}
        </AppText>
        <AppText style={{ fontFamily: fonts.bold, fontSize: 20, lineHeight: 24 }}>{title}</AppText>
        <AppText variant="footnote" tone="secondary" style={{ lineHeight: 19 }}>
          {children}
        </AppText>
        {footer}
      </View>
    </Panel>
  );
};

export default function DataPrivacyScreen() {
  const { colors } = useTheme();
  const { user, demo } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    setMessage(null);
    try {
      const entries = await Promise.all(
        TABLES.map(async (table) => {
          try {
            // The generated types lag a few newer tables; the export should still
            // include every table the user can read.
            const client = supabase as unknown as {
              from: (relation: string) => {
                select: (columns: string) => {
                  eq: (column: string, value: string) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
                };
              };
            };
            const { data, error } = await client.from(table).select('*').eq('user_id', user.id);
            if (error) return [table, { error: error.message }] as const;
            return [table, { rows: data ?? [] }] as const;
          } catch (caught) {
            return [
              table,
              { error: caught instanceof Error ? caught.message : 'Could not read this table.' },
            ] as const;
          }
        }),
      );

      const payload = {
        app: 'Auxo',
        version: 1,
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email ?? null },
        tables: Object.fromEntries(entries),
      };

      const file = new File(Paths.cache, `auxo-export-${isoDate()}.json`);
      await file.write(JSON.stringify(payload, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Auxo data',
        });
        setMessage('Export ready.');
      } else {
        setMessage(`Export saved to ${file.uri}`);
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not export your data.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <PageHeader back="/(tabs)/more" title="Data & privacy" date={formatStamp()} rule={false} />

      <InfoPanel icon="device" label="ON THIS DEVICE" title="Your preferences and onboarding state.">
        Demo data, local hydration target, reminder settings and the active walk session stay on
        this phone.
      </InfoPanel>

      <InfoPanel
        icon="user"
        label="IN YOUR ACCOUNT"
        title="Only the records you log."
        footer={
          user?.email ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                marginTop: space.sm,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radius.inner,
                backgroundColor: colors.surfaceSunken,
              }}
            >
              <AppText variant="caption" tone="tertiary" style={{ flex: 1 }}>
                ACCOUNT
              </AppText>
              <AppText
                variant="footnote"
                style={{ fontFamily: fonts.bold, color: colors.text }}
                selectable
                numberOfLines={1}
              >
                {user.email}
              </AppText>
            </View>
          ) : null
        }
      >
        {demo
          ? 'You are in demo mode, so this export reads sample data from this device.'
          : 'Health, money and relationship records sync to your Auxo account. No feed, no ads and no sale of your data.'}
      </InfoPanel>

      <Panel style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="download" size={21} color={colors.onPrimary} />
          </View>
          <AppText style={{ fontFamily: fonts.black, fontSize: 26, lineHeight: 30 }}>
            Take it with you
          </AppText>
        </View>
        <AppText variant="footnote" tone="secondary" style={{ lineHeight: 19 }}>
          A JSON file with every record this account can see. Open it in any text editor or keep it
          as a backup.
        </AppText>
        <Button
          label="Export all data"
          onPress={() => void exportData()}
          loading={exporting}
          disabled={!user}
        />
        {message ? (
          <AppText variant="footnote" tone="secondary" selectable>
            {message}
          </AppText>
        ) : null}
      </Panel>
    </Screen>
  );
}
