import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { PillSegmented } from '@/components/ui/pill-segmented';
import { Screen } from '@/components/ui/screen';
import { formatStamp, isoDate } from '@/lib/format';
import { fonts, radius, space, useTheme } from '@/theme';

type Tab = 'privacy' | 'terms' | 'support';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'privacy', label: 'Privacy' },
  { value: 'terms', label: 'Terms' },
  { value: 'support', label: 'Support' },
];

const InfoPanel = ({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
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
      <View style={{ flex: 1, gap: space.xs }}>
        <AppText variant="caption" tone="primary">
          {label}
        </AppText>
        <AppText variant="footnote" tone="secondary" style={{ lineHeight: 19 }}>
          {children}
        </AppText>
      </View>
    </Panel>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <AppText style={{ fontFamily: fonts.black, fontSize: 28, lineHeight: 32 }}>{children}</AppText>
);

export default function LegalScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const initial = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const [tab, setTab] = useState<Tab>(
    initial === 'terms' || initial === 'support' ? initial : 'privacy',
  );

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.xl }}
      footer={
        <PillSegmented
          options={TABS}
          value={tab}
          onChange={(value) => setTab(value as Tab)}
        />
      }
    >
      <PageHeader back="/(tabs)/more" title="Legal & support" date={formatStamp()} rule={false} />

      {tab === 'privacy' ? (
        <>
          <SectionTitle>Privacy, in plain words</SectionTitle>
          <InfoPanel icon="user" label="WHAT AUXO STORES">
            Auxo stores the account and records you choose to add: profile details, health and
            cycle logs, food entries, financial records and relationship notes. Your account data
            is hosted by Nhost on our behalf. It is not sold, used for advertising, or placed in a
            public feed.
          </InfoPanel>
          <InfoPanel icon="phone" label="PERMISSIONS">
            Location, motion, camera, notifications and Health Connect are only used for the
            feature you turn on. Walk routes stay with the walk record. Barcode scans are sent to
            Open Food Facts to look up nutrition; the barcode is not linked to your account.
          </InfoPanel>
          <InfoPanel icon="download" label="YOUR CONTROL">
            You can export every record from Data & privacy and delete the account from You. A
            deleted account removes its records and sign-in. Backups may take a short period to
            age out.
          </InfoPanel>
          <Button
            label="Open Data & privacy"
            variant="secondary"
            onPress={() => router.push('/data-privacy' as never)}
          />
        </>
      ) : null}

      {tab === 'terms' ? (
        <>
          <SectionTitle>The short version</SectionTitle>
          <View
            style={{
              gap: space.sm,
              borderRadius: radius.group,
              borderWidth: 1,
              borderColor: 'rgba(198, 242, 78, 0.28)',
              backgroundColor: 'rgba(198, 242, 78, 0.07)',
              padding: space.lg,
            }}
          >
            <AppText variant="caption" tone="primary">
              IN SHORT
            </AppText>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 19 }}>
              Auxo is a personal tracking and reflection tool. It is not medical, mental-health,
              legal or financial advice. Scores and suggestions are heuristics based on what you
              log; they can be incomplete or wrong.
            </AppText>
          </View>

          {[
            'Keep your sign-in details private and use the app lawfully. Do not rely on Auxo for emergencies or as a substitute for a qualified professional. The service is provided as-is while it is in development.',
            'By creating an account you agree to these terms and the privacy notice. The app may change, and these terms may be updated with the product.',
          ].map((body, index) => (
            <View key={body} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  tone="primary"
                  style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 18 }}
                >
                  {index + 1}
                </AppText>
              </View>
              <AppText variant="footnote" tone="secondary" style={{ flex: 1, lineHeight: 19 }}>
                {body}
              </AppText>
            </View>
          ))}
        </>
      ) : null}

      {tab === 'support' ? (
        <>
          <SectionTitle>Need a hand?</SectionTitle>
          <Panel style={{ gap: space.md }}>
            <AppText variant="footnote" tone="secondary" style={{ lineHeight: 19 }}>
              Tell us what happened, what you expected, and which phone you are using. Do not send
              passwords or health records.
            </AppText>
            <Button
              label="Email support"
              onPress={() => Linking.openURL('mailto:support@auxo.app').catch(() => undefined)}
            />
          </Panel>

          <SectionTitle>Common fixes</SectionTitle>
          <InfoPanel icon="signIn" label="SIGN-IN LINK">
            If a sign-in link does not open, update the app and try again.
          </InfoPanel>
          <InfoPanel icon="bell" label="HEALTH IMPORT">
            If a health import is empty, check that Health Connect has data and that Auxo has read
            permission.
          </InfoPanel>
        </>
      ) : null}

      <AppText variant="footnote" tone="tertiary">
        Auxo 1.0 · {isoDate()}
      </AppText>
    </Screen>
  );
}
