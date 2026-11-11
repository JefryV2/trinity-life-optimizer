import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { GrowBar } from '@/components/ui/grow-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { formatStamp } from '@/lib/format';
import { ACTION_HINT, PILLAR_COLOR, PILLAR_ROUTE } from '@/lib/score-labels';
import { LoadingState } from '@/components/ui/states';
import { space, useTheme } from '@/theme';


export default function Why() {
  const { colors } = useTheme();
  const { data, isPending } = useDashboard();

  const report = data?.score;
  const strongest = report?.pillars.find((pillar) => pillar.key === report.strongest);
  const weakest = report?.pillars.find((pillar) => pillar.key === report.weakest);

  return (
    <Screen>
      <PageHeader title="Why" date={formatStamp()} subtitle="Every point traced to an input." />

      {isPending || !report ? <LoadingState rows={4} /> : null}

      {report ? (
        <>
          <Animated.View entering={FadeInDown.duration(240)} style={{ gap: space.xs }}>
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
          </Animated.View>

          {report.topAction ? (
            <Animated.View entering={FadeInDown.duration(240).delay(60)} style={{ gap: space.md }}>
              <SectionHeader index="01" title="Biggest move" />
              <Card style={{ gap: space.sm }}>
                <AppText variant="headline">{report.topAction.label}</AppText>
                <AppText variant="footnote" tone="tertiary">
                  {report.topAction.display}
                </AppText>
                <AppText variant="callout">
                  {ACTION_HINT[report.topAction.key] ?? 'Log this to earn the points'}
                </AppText>
                <AppText variant="caption" tone="primary">
                  {report.topAction.points} points available
                </AppText>
                <Button
                  label={`Go to ${report.topAction.pillar}`}
                  variant="secondary"
                  onPress={() => router.push(PILLAR_ROUTE[report.topAction!.pillar] as never)}
                />
                <AppText
                  variant="caption"
                  tone="primary"
                  onPress={() => router.push('/experiments' as never)}
                  style={{ paddingTop: 2 }}
                >
                  Try it for 7 days →
                </AppText>
              </Card>
            </Animated.View>
          ) : null}

          {report.pillars.map((pillar, index) => (
            <Animated.View
              key={pillar.key}
              entering={FadeInDown.duration(240).delay(120 + index * 70)}
              style={{ gap: space.md }}
            >
              <SectionHeader index={String(index + 2).padStart(2, '0')} title={pillar.label} />
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
                  <AppText variant="numeric" style={{ color: PILLAR_COLOR[pillar.key], fontSize: 26, lineHeight: 30 }}>
                    {pillar.value}
                  </AppText>
                </View>
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
                    <AppText variant="caption" tone="faint">
                      {item.display}
                      {item.lost > 0 ? ` · ${item.lost} points left` : ' · full'}
                    </AppText>
                  </View>
                ))}
              </Card>
            </Animated.View>
          ))}

          <AppText variant="footnote" tone="faint" style={{ lineHeight: 18 }}>
            Each input has a fixed ceiling, so every point can be traced back to something you
            logged. These are heuristics for spotting patterns — not medical or financial advice.
          </AppText>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: space.md })}
          >
            <AppText variant="footnote" tone="primary">
              ← Back to today
            </AppText>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}
