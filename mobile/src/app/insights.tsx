import { useState } from 'react';
import { RefreshControl, useWindowDimensions, View } from 'react-native';

import { LineChart } from '@/components/charts/line-chart';
import { ScatterChart } from '@/components/charts/scatter-chart';
import { AppText } from '@/components/ui/app-text';
import { DetailHeader } from '@/components/ui/detail-header';
import { PillSegmented } from '@/components/ui/pill-segmented';
import { Panel } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useInsights, type InsightDay } from '@/features/insights/use-insights';
import { formatDate, formatNumber, scoreLabel } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const scoreFor = (day: InsightDay) => {
  const values = [day.health, day.wealth, day.relations].filter(
    (value): value is number => value !== null,
  );
  return values.length > 0 ? average(values) : null;
};

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<'7' | '30'>('30');
  const { data, isPending, isError, error, refetch, isRefetching } = useInsights(
    range === '7' ? 7 : 30,
  );

  const chartDays = data?.days.slice(range === '7' ? -7 : -30) ?? [];
  const scores = chartDays
    .map(scoreFor)
    .filter((value): value is number => value !== null);
  const score = scores.length > 0 ? Math.round(average(scores)) : 0;
  const moodCorrelations = (data?.correlations ?? [])
    .filter((item) => item.label.toLowerCase().includes('mood'))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 2);
  const scatterPoints = (data?.days ?? [])
    .filter((day) => day.sleep !== null && day.mood !== null)
    .map((day) => ({ x: day.sleep as number, y: day.mood as number }));
  const chartWidth = Math.max(200, Math.min(720, width) - 80);

  const latest = (key: 'sleep' | 'steps' | 'mood') => {
    const values = (data?.days ?? [])
      .map((day) => day[key])
      .filter((value): value is number => value !== null);
    return values.length ? values[values.length - 1] : null;
  };

  const metrics = data
    ? [
        {
          key: 'sleep',
          label: 'SLEEP',
          latest: latest('sleep'),
          average: data.sleepAvg,
          format: (value: number) => value.toFixed(1),
          suffix: 'h',
        },
        {
          key: 'steps',
          label: 'STEPS',
          latest: latest('steps'),
          average: data.stepsAvg,
          format: (value: number) => formatNumber(value),
          suffix: '',
        },
        {
          key: 'mood',
          label: 'MOOD',
          latest: latest('mood'),
          average: data.moodAvg,
          format: (value: number) => value.toFixed(1),
          suffix: '',
        },
      ]
    : [];

  const pillarValues = data
    ? [
        { label: 'Health', value: Math.round(data.healthAvg), color: colors.primary },
        { label: 'Wealth', value: Math.round(data.wealthAvg), color: colors.amber },
        { label: 'People', value: Math.round(data.relationsAvg), color: colors.bonds },
      ]
    : [];
  const weakest = [...pillarValues].sort((a, b) => a.value - b.value)[0];
  const strongest = [...pillarValues].sort((a, b) => b.value - a.value)[0];

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <DetailHeader title="Insights" fallback="/(tabs)" />

      <PillSegmented
        options={[
          { value: '7', label: '7 days' },
          { value: '30', label: '30 days' },
        ]}
        value={range}
        onChange={setRange}
      />

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data ? (
        <>
          <View style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.md,
              }}
            >
              <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.7 }}>
                {`AUXO SCORE · LAST ${range} DAYS`}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View
                  style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }}
                />
                <AppText variant="footnote" tone="primary">
                  {scoreLabel(score)}
                </AppText>
              </View>
            </View>
            <AppText
              variant="display"
              selectable
              style={{ fontSize: 56, lineHeight: 60, letterSpacing: -2.5 }}
            >
              {score}
            </AppText>
            <LineChart
              values={chartDays.map((day) => scoreFor(day) ?? 0)}
              width={chartWidth}
              height={132}
              maxValue={100}
              fill
              grid={false}
              startLabel={chartDays[0] ? formatDate(chartDays[0].date) : undefined}
              endLabel={
                chartDays[chartDays.length - 1]
                  ? formatDate(chartDays[chartDays.length - 1].date)
                  : undefined
              }
            />
          </View>

          <View style={{ gap: space.md }}>
            <AppText variant="headline" style={{ fontSize: 24, lineHeight: 28 }}>
              Latest vs average
            </AppText>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {metrics.map((metric) => {
                const delta =
                  metric.latest !== null && metric.average
                    ? metric.latest - metric.average
                    : null;
                const positive = delta !== null && delta >= 0;
                return (
                  <View
                    key={metric.key}
                    style={{
                      flex: 1,
                      gap: 5,
                      minHeight: 112,
                      padding: space.md,
                      borderRadius: radius.inner,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.5 }}>
                      {metric.label}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <AppText
                        variant="numeric"
                        style={{ fontSize: 25, lineHeight: 28 }}
                      >
                        {metric.latest === null ? '—' : metric.format(metric.latest)}
                      </AppText>
                      {metric.suffix ? (
                        <AppText variant="footnote" tone="tertiary">
                          {metric.suffix}
                        </AppText>
                      ) : null}
                    </View>
                    {delta !== null ? (
                      <AppText
                        variant="footnote"
                        style={{
                          fontSize: 11,
                          lineHeight: 15,
                          color: positive ? colors.success : colors.textTertiary,
                        }}
                        numberOfLines={1}
                      >
                        {`${positive ? '▲' : '▼'} ${positive ? '+' : ''}${metric.format(delta)}${
                          metric.suffix
                        } vs avg`}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {metric.average ? metric.format(metric.average) : '—'}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <AppText variant="headline" style={{ fontSize: 24, lineHeight: 28 }}>
                Your pillars
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                {range}-day average
              </AppText>
            </View>
            <Panel style={{ gap: space.md }}>
              {pillarValues.map((pillar) => (
                <View key={pillar.label} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {pillar.label}
                    </AppText>
                    <AppText
                      variant="headline"
                      style={{ color: pillar.color, fontSize: 22, lineHeight: 26 }}
                    >
                      {pillar.value}
                    </AppText>
                  </View>
                  <Progress value={pillar.value} color={pillar.color} height={7} />
                </View>
              ))}
              {weakest && strongest && weakest.value < strongest.value ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: weakest.color }}
                  />
                  <AppText variant="footnote" tone="secondary">
                    {`${weakest.label} trails your other pillars by ${
                      strongest.value - weakest.value
                    } pts.`}
                  </AppText>
                </View>
              ) : null}
            </Panel>
          </View>

          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <AppText variant="headline" style={{ fontSize: 24, lineHeight: 28 }}>
                What drives your mood
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                Correlation, 0–1
              </AppText>
            </View>
            {moodCorrelations.length === 0 ? (
              <EmptyState
                icon="chart"
                title="Not enough signal yet"
                message="Log sleep, steps and mood for a few more days; the ranking appears with enough paired days."
              />
            ) : (
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {moodCorrelations.map((item) => (
                  <View
                    key={item.label}
                    style={{
                      flex: 1,
                      gap: space.sm,
                      padding: space.md,
                      borderRadius: radius.inner,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.5 }}>
                      {item.label.replace(' vs mood', '').toUpperCase()}
                    </AppText>
                    <AppText
                      variant="display"
                      style={{ color: colors.primary, fontSize: 36, lineHeight: 40 }}
                    >
                      {item.value.toFixed(2)}
                    </AppText>
                    <Progress value={Math.abs(item.value) * 100} height={6} />
                    <AppText variant="footnote" tone="secondary">
                      {item.note}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {scatterPoints.length > 1 ? (
            <View style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <AppText variant="headline" style={{ fontSize: 24, lineHeight: 28 }}>
                  Sleep vs mood
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  each dot is a day
                </AppText>
              </View>
              <Panel>
                <ScatterChart
                  points={scatterPoints}
                  width={chartWidth}
                  xMax={10}
                  yMax={10}
                  xLabel="SLEEP, HOURS →"
                  yLabel="↑ MOOD, 0–10"
                />
              </Panel>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
