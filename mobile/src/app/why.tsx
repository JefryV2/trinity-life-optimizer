import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GrowBar } from '@/components/ui/grow-bar';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { LoadingState } from '@/components/ui/states';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { formatStamp } from '@/lib/format';
import { ACTION_HINT, PILLAR_COLOR, PILLAR_ROUTE } from '@/lib/score-labels';
import { space, useTheme } from '@/theme';

export default function Why() {
  const { colors } = useTheme();
  const { data, isPending } = useDashboard();

  const report = data?.score;
  const strongest = report?.pillars.find((pillar) => pillar.key === report.strongest);
  const weakest = report?.pillars.find((pillar) => pillar.key === report.weakest);

  return (
    <Screen>
      <PageHeader back="/(tabs)" title="Why" date={formatStamp()} />

      {isPending || !report ? <LoadingState rows={4} /> : null}

      {report ? (
        <>
          <View style={{ gap: space.xs }}>
            <AppText variant="caption" tone="tertiary">
              LIFE SCORE
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
              <AppText variant="display" selectable>
                {report.total}
              </AppText>
              <AppText variant="footnote" tone="tertiary" style={{ paddingBottom: 10 }}>
                OF 100
              </AppText>
            </View>
            <AppText variant="callout" tone="secondary">
              {report.total === 0
                ? 'Nothing logged yet. One entry is enough to start the reading.'
                : `${strongest?.label ?? ''} is carrying you. ${weakest?.label ?? ''} has the most room.`}
            </AppText>
          </View>

          {report.topAction ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Next step" />
              <Card style={{ gap: space.sm }}>
                <AppText variant="headline">
                  {ACTION_HINT[report.topAction.key] ?? 'Log this to earn the points'}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  {`${report.topAction.display} · ${report.topAction.points} points available`}
                </AppText>
                <Button
                  label={`Go to ${
                    report.topAction.pillar === 'bonds'
                      ? 'People'
                      : `${report.topAction.pillar[0].toUpperCase()}${report.topAction.pillar.slice(1)}`
                  }`}
                  onPress={() => router.push(PILLAR_ROUTE[report.topAction!.pillar] as never)}
                />
              </Card>
            </View>
          ) : null}

          {report.pillars.map((pillar, index) => (
            <View key={pillar.key} style={{ gap: space.md }}>
              <SectionHeader title={pillar.label} />
              <Card padded={false} style={{ paddingHorizontal: space.lg }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    paddingTop: space.md,
                  }}
                >
                  <AppText variant="caption" tone="tertiary">
                    SCORE
                  </AppText>
                  <AppText
                    variant="numeric"
                    style={{ color: PILLAR_COLOR[pillar.key], fontSize: 26, lineHeight: 30 }}
                  >
                    {pillar.value}
                  </AppText>
                </View>
                <AppText variant="footnote" tone="tertiary" style={{ paddingTop: space.xs }}>
                  {`${pillar.contributions.filter((item) => item.tracked).length} inputs`}
                </AppText>
                {pillar.contributions.map((item, itemIndex) => (
                  <View
                    key={item.key}
                    style={{
                      gap: 7,
                      paddingVertical: space.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.separator,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="footnote" tone="secondary">
                        {item.label}
                      </AppText>
                      <AppText variant="callout" selectable>
                        {item.points}
                        <AppText variant="footnote" tone="tertiary">
                          {` / ${item.max}`}
                        </AppText>
                      </AppText>
                    </View>
                    <GrowBar
                      ratio={item.ratio}
                      color={item.points === item.max ? colors.text : PILLAR_COLOR[pillar.key]}
                      delay={180 + index * 70 + itemIndex * 50}
                    />
                    <AppText variant="footnote" tone="tertiary">
                      {item.display}
                      {item.lost > 0 ? ` · ${item.lost} points left` : ' · full'}
                    </AppText>
                  </View>
                ))}
              </Card>
            </View>
          ))}

          <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 18 }}>
            Each input has a fixed ceiling, so every point can be traced back to something you
            logged. These are heuristics for spotting patterns — not medical or financial advice.
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}
