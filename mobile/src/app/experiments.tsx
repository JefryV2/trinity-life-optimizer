import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (loading) {
    return (
      <Screen>
        <PageHeader back="/(tabs)/more" title="Experiments" date={formatStamp()} />
        <LoadingState rows={4} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <PageHeader back="/(tabs)/more" title="Experiments" date={formatStamp()} />
        <ErrorState message={error.message} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  const running = experiment?.status === 'running';
  const pickable = levers.filter((item) =>
    ['sleep', 'steps', 'savings', 'contact'].includes(item.key),
  );
  const selected = pickable.find((item) => item.key === selectedKey) ?? null;
  const blocks = Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = experiment ? addDays(experiment.started_on, index) : null;
    const day = date ? days.find((row) => row.date === date) : undefined;
    const met = lever && day ? dayMeetsLever(lever, day) : null;
    return { index, met };
  });

  return (
    <Screen>
      <PageHeader back="/(tabs)/more"
        title={experiment ? 'Experiment' : 'Experiments'}
        date={formatStamp()}
        subtitle={
          experiment
            ? running
              ? `Day ${dayIndex} of ${WINDOW_DAYS} · ${lever?.rule ?? ''}`
              : `${experiment.started_on} → ${experiment.ends_on}`
            : undefined
        }
      />

      {experiment && lever ? (
        <>
          <View style={{ gap: space.xs }}>
            <AppText variant="caption" tone="tertiary">
              {running ? 'RUNNING' : 'FINISHED'}
            </AppText>
            <AppText variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
              {lever.label}
            </AppText>
          </View>

          <View style={{ gap: space.md }}>
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
          </View>

          {verdict ? (
            <View style={{ gap: space.md }}>
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
            </View>
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

          <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 18 }}>
            Ending early is not a failure — a week you stop is still a week you learned from.
          </AppText>
        </>
      ) : (
        <>
          <View style={{ gap: space.xs }}>
            <AppText variant="caption" tone="tertiary">
              START A WEEK
            </AppText>
            <AppText variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
              One change
            </AppText>
            <AppText variant="callout" tone="secondary">
              Pick one rule to hold for seven days. At the end it compares the days you met with the
              days you missed.
            </AppText>
          </View>

          <View style={{ gap: space.md }}>
            <SectionHeader title="Choose" />
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              {pickable.map((item: Lever, index) => {
                const isSelected = selectedKey === item.key;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedKey(item.key)}
                    style={({ pressed }) => ({
                      paddingVertical: space.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.separator,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 1,
                        }}
                      >
                        {isSelected ? (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: colors.primary,
                            }}
                          />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                          <AppText variant="callout" style={{ flex: 1 }}>
                            {item.label}
                          </AppText>
                          <AppText variant="caption" style={{ color: PILLAR_COLOR[item.pillar] }}>
                            {item.pillar === 'bonds' ? 'PEOPLE' : item.pillar.toUpperCase()}
                          </AppText>
                        </View>
                        <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 18 }}>
                          {item.rationale}
                        </AppText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
            <Button
              label={selected ? `Start ${selected.label} for 7 days` : 'Choose one first'}
              disabled={!selected}
              loading={starting}
              onPress={() => {
                if (selected) start(selected);
              }}
            />
            <AppText variant="footnote" tone="tertiary" style={{ lineHeight: 18 }}>
              A week is judged from the days you logged — up to three on each side of the rule. You
              can end it early at any point.
            </AppText>
          </View>
        </>
      )}
    </Screen>
  );
}
