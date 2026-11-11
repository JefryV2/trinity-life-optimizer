import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GrowBar } from '@/components/ui/grow-bar';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { addDays, useExperiments, WINDOW_DAYS } from '@/features/experiments/use-experiments';
import { dayMeetsLever, type Lever } from '@/lib/experiment';
import { formatStamp } from '@/lib/format';
import { PILLAR_COLOR } from '@/lib/score-labels';
import { radius, space, useTheme } from '@/theme';

/** One lever, seven days, judged against the days that were logged anyway. */
export default function Experiments() {
  const { colors } = useTheme();
  const {
    experiment,
    lever,
    days,
    verdict,
    dayIndex,
    levers,
    loading,
    starting,
    finishing,
    error,
    start,
    finish,
    refresh,
  } = useExperiments();

  if (loading) {
    return (
      <Screen>
        <PageHeader title="Experiments" date={formatStamp()} />
        <LoadingState rows={4} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <PageHeader title="Experiments" date={formatStamp()} />
        <ErrorState message={error.message} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  const running = experiment?.status === 'running';
  const blocks = Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = experiment ? addDays(experiment.started_on, index) : null;
    const day = date ? days.find((row) => row.date === date) : undefined;
    const met = lever && day ? dayMeetsLever(lever, day) : null;
    return { index, met };
  });

  return (
    <Screen>
      <PageHeader
        title={experiment ? 'Experiment' : 'Experiments'}
        date={formatStamp()}
        subtitle={
          experiment
            ? running
              ? `Day ${dayIndex} of ${WINDOW_DAYS} · ${lever?.rule ?? ''}`
              : `${experiment.started_on} → ${experiment.ends_on}`
            : 'One rule, held for a week.'
        }
      />

      {experiment && lever ? (
        <>
          <Animated.View entering={FadeInDown.duration(240)} style={{ gap: space.xs }}>
            <AppText variant="caption" tone="tertiary">
              {running ? 'RUNNING' : 'FINISHED'}
            </AppText>
            <AppText variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
              {lever.label}
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(60)} style={{ gap: space.md }}>
            <SectionHeader index="01" title="The week" />
            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="caption" tone="tertiary">
                  MET
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {blocks.filter((block) => block.met).length} of {WINDOW_DAYS}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {blocks.map((block) => (
                  <View
                    key={block.index}
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: radius.segment,
                      backgroundColor:
                        block.met === null
                          ? colors.surfaceSunken
                          : block.met
                            ? PILLAR_COLOR[lever.pillar]
                            : colors.textFaint,
                    }}
                  />
                ))}
              </View>
              <AppText variant="footnote" tone="tertiary">
                {lever.rationale}
              </AppText>
            </Card>
          </Animated.View>

          {verdict ? (
            <Animated.View entering={FadeInDown.duration(240).delay(120)} style={{ gap: space.md }}>
              <SectionHeader
                index="02"
                title="Verdict"
                actionLabel={verdict.confidence === 'none' ? 'not enough' : verdict.confidence}
              />
              <Card style={{ gap: space.sm }}>
                <AppText variant="headline">{verdict.headline}</AppText>
                <AppText variant="footnote" tone="secondary" style={{ lineHeight: 19 }}>
                  {verdict.detail}
                </AppText>

                {verdict.scoreOn !== null && verdict.scoreOff !== null ? (
                  <View style={{ gap: space.md, paddingTop: space.xs }}>
                    {[
                      { label: `MET ${verdict.met}×`, value: verdict.scoreOn, color: PILLAR_COLOR[lever.pillar] },
                      { label: `MISSED ${verdict.missed}×`, value: verdict.scoreOff, color: colors.textTertiary },
                    ].map((row, index) => (
                      <View key={row.label} style={{ gap: 7 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <AppText variant="caption" tone="tertiary">
                            {row.label}
                          </AppText>
                          <AppText variant="callout">{row.value}</AppText>
                        </View>
                        <GrowBar ratio={row.value} color={row.color} delay={160 + index * 60} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            </Animated.View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {running ? (
              <>
                <View style={{ flex: 1 }}>
                  <Button
                    label="End early"
                    variant="secondary"
                    loading={finishing}
                    onPress={() => finish('abandoned')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Finish" loading={finishing} onPress={() => finish('done')} />
                </View>
              </>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Button label="See reading" variant="secondary" onPress={() => router.push('/why' as never)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="New week"
                    loading={finishing}
                    onPress={() => finish('done')}
                  />
                </View>
              </>
            )}
          </View>

          <AppText variant="caption" tone="faint" style={{ lineHeight: 16 }}>
            Ending early is not a failure — a week you stop is still a week you learned from.
          </AppText>
        </>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(240)} style={{ gap: space.xs }}>
            <AppText variant="caption" tone="tertiary">
              START A WEEK
            </AppText>
            <AppText variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
              One lever
            </AppText>
            <AppText variant="callout" tone="secondary">
              Pick a single rule to hold for seven days. The app already records the days — at the
              end it compares the ones you met with the ones you missed.
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(60)} style={{ gap: space.md }}>
            <SectionHeader index="01" title="Choose" />
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              {levers
                .filter((item) => ['sleep', 'steps', 'savings', 'contact'].includes(item.key))
                .map((item: Lever, index) => (
                  <View
                    key={item.key}
                    style={{
                      paddingVertical: space.md,
                      gap: 6,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.separator,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                      <AppText variant="callout" style={{ flex: 1 }}>
                        {item.label}
                      </AppText>
                      <AppText variant="caption" style={{ color: PILLAR_COLOR[item.pillar] }}>
                        {item.pillar}
                      </AppText>
                    </View>
                    <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 18 }}>
                      {item.rationale}
                    </AppText>
                    <AppText
                      variant="caption"
                      tone="primary"
                      onPress={() => start(item)}
                      style={{ paddingTop: 2, opacity: starting ? 0.5 : 1 }}
                    >
                      Start 7 days →
                    </AppText>
                  </View>
                ))}
            </Card>
            <AppText variant="caption" tone="faint" style={{ lineHeight: 16 }}>
              A week is judged from the days you logged — up to three on each side of the rule. You
              can end it early at any point.
            </AppText>
          </Animated.View>
        </>
      )}
    </Screen>
  );
}
