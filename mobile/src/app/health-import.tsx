import { useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useHealthImport, type ImportSummary } from '@/features/health/health-connect-import';
import { track } from '@/lib/analytics';
import { isoDate, formatStamp } from '@/lib/format';
import { space } from '@/theme';

export default function HealthImportScreen() {
  const { importHealth } = useHealthImport();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await importHealth();
      setSummary(result);
      void track('import_connected', { source: 'health-connect', steps: result.steps });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not import health data.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <BackLink />
      <PageHeader title="Health import" date={formatStamp()} />

      {Platform.OS === 'android' ? (
        <>
          <SectionHeader title="Android" />
          <Card style={{ gap: space.md }}>
            <AppText variant="headline">Health Connect</AppText>
            <AppText variant="footnote" tone="secondary">
              Import steps, sleep sessions and heart-rate samples from the last 14 days. Existing
              manual entries are left alone.
            </AppText>
            <Button label="Connect and import" loading={busy} onPress={() => void run()} />
          </Card>
        </>
      ) : (
        <>
          <SectionHeader title="iPhone" />
          <Card style={{ gap: space.md }}>
            <AppText variant="headline">Apple Health</AppText>
            <AppText variant="footnote" tone="secondary">
              Apple Health needs a HealthKit entitlement and a signed iOS build. The import surface
              is ready; the iOS native module is not in this Android build.
            </AppText>
            <Button label="Not available in this build" disabled onPress={() => undefined} />
          </Card>
        </>
      )}

      {summary ? (
        <Card style={{ gap: space.sm }}>
          <AppText variant="headline">Imported</AppText>
          <AppText variant="footnote" tone="secondary">
            {summary.steps} step days · {summary.sleep} sleep sessions · {summary.heart} heart
            samples from the last {summary.days} days.
          </AppText>
        </Card>
      ) : null}

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 19 }}>
        Auxo reads only what you approve in Health Connect. Import is one-way: Auxo does not write
        back to Health Connect.
      </AppText>
    </Screen>
  );
}
