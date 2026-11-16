import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { isoDate, formatStamp } from '@/lib/format';
import { space } from '@/theme';

type Tab = 'privacy' | 'terms' | 'support';

const TABS = [
  { value: 'privacy', label: 'Privacy' },
  { value: 'terms', label: 'Terms' },
  { value: 'support', label: 'Support' },
];

export default function LegalScreen() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const initial = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const [tab, setTab] = useState<Tab>(
    initial === 'terms' || initial === 'support' ? initial : 'privacy',
  );

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <BackLink />
      <PageHeader title="Legal & support" date={formatStamp()} />
      <Chips options={TABS} value={tab} onChange={(value) => setTab(value as Tab)} />

      {tab === 'privacy' ? (
        <>
          <Card style={{ gap: space.md }}>
            <AppText variant="headline">Privacy, in plain words</AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              Auxo stores the account and records you choose to add: profile details, health and
              cycle logs, food entries, financial records and relationship notes. Your account data
              is hosted by Nhost on our behalf. It is not sold, used for advertising, or placed in a
              public feed.
            </AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              Location, motion, camera, notifications and Health Connect are only used for the
              feature you turn on. Walk routes stay with the walk record. Barcode scans are sent to
              Open Food Facts to look up nutrition; the barcode is not linked to your account.
            </AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              You can export every record from Data & privacy and delete the account from You. A
              deleted account removes its records and sign-in. Backups may take a short period to
              age out.
            </AppText>
          </Card>
          <Button label="Open Data & privacy" variant="secondary" onPress={() => router.push('/data-privacy' as never)} />
        </>
      ) : null}

      {tab === 'terms' ? (
        <>
          <Card style={{ gap: space.md }}>
            <AppText variant="headline">The short version</AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              Auxo is a personal tracking and reflection tool. It is not medical, mental-health,
              legal or financial advice. Scores and suggestions are heuristics based on what you
              log; they can be incomplete or wrong.
            </AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              Keep your sign-in details private and use the app lawfully. Do not rely on Auxo for
              emergencies or as a substitute for a qualified professional. The service is provided
              as-is while it is in development.
            </AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              By creating an account you agree to these terms and the privacy notice. The app may
              change, and these terms may be updated with the product.
            </AppText>
          </Card>
        </>
      ) : null}

      {tab === 'support' ? (
        <>
          <Card style={{ gap: space.md }}>
            <AppText variant="headline">Need a hand?</AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              Tell us what happened, what you expected, and which phone you are using. Do not send
              passwords or health records.
            </AppText>
            <Button
              label="Email support"
              onPress={() => Linking.openURL('mailto:support@auxo.app').catch(() => undefined)}
            />
          </Card>
          <Card style={{ gap: space.sm }}>
            <AppText variant="callout">Common fixes</AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 20 }}>
              If a sign-in link does not open, update the app and try again. If a health import is
              empty, check that Health Connect has data and that Auxo has read permission.
            </AppText>
          </Card>
        </>
      ) : null}

      <AppText variant="footnote" tone="tertiary">
        Auxo 1.0 · {isoDate()}
      </AppText>
    </Screen>
  );
}
