import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { isoDate, formatStamp } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { space, useTheme } from '@/theme';

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
      <PageHeader back="/(tabs)/more" title="Data & privacy" date={formatStamp()} />

      <SectionHeader title="On this device" />
      <Card style={{ gap: space.sm }}>
        <AppText variant="callout">Your preferences and onboarding state.</AppText>
        <AppText variant="footnote" tone="secondary">
          Demo data, local hydration target, reminder settings and the active walk session stay
          on this phone.
        </AppText>
      </Card>

      <SectionHeader title="In your account" />
      <Card style={{ gap: space.sm }}>
        <AppText variant="callout">Only the records you log.</AppText>
        <AppText variant="footnote" tone="secondary">
          {demo
            ? 'You are in demo mode, so this export reads sample data from this device.'
            : 'Health, money and relationship records sync to your Auxo account. No feed, no ads and no sale of your data.'}
        </AppText>
        {user?.email ? (
          <View style={{ paddingTop: space.xs }}>
            <AppText variant="caption" tone="tertiary">
              ACCOUNT
            </AppText>
            <AppText variant="footnote" tone="secondary" selectable>
              {user.email}
            </AppText>
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Take it with you" />
      <Card style={{ gap: space.md }}>
        <AppText variant="footnote" tone="secondary">
          A JSON file with every record this account can see. Open it in any text editor or keep
          it as a backup.
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
      </Card>

      <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 19 }}>
        Deleting the account removes the records and the sign-in. The export is the copy you
        control before that happens.
      </AppText>
    </Screen>
  );
}
