import { useState } from 'react';
import { RefreshControl, useWindowDimensions, View } from 'react-native';

import { LineChart } from '@/components/charts/line-chart';
import { ScatterChart } from '@/components/charts/scatter-chart';
import { RadarChart } from '@/components/charts/radar-chart';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useInsights } from '@/features/insights/use-insights';
import { formatDate, formatNumber } from '@/lib/format';
import { space, useTheme } from '@/theme';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<'7' | '30'>('30');
  const { data, isPending, isError, error, refetch, isRefetching } = useInsights(range === '7' ? 7 : 30);

  const chartDays = data?.days.slice(-14) ?? [];
  const moodCorrelations = (data?.correlations ?? [])
    .filter((item) => item.label.toLowerCase().includes('mood'))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const scatterPoints = (data?.days ?? [])
    .filter((day) => day.sleep !== null && day.mood !== null)
    .map((day) => ({ x: day.sleep as number, y: day.mood as number }));
  const chartWidth = Math.max(200, Math.min(720, width) - 80);

  const latest = (key: 'sleep' | 'steps' | 'mood') => {
    const values = (data?.days ?? []).map((day) => day[key]).filter((value): value is number => value !== null);
    return values.length ? values[values.length - 1] : null;
  };

  return (
    <Screen
      safeAreaTop={false}
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
      <Segmented
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
          <Card raised style={{ gap: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
              <AppText variant="headline" style={{ flex: 1 }}>
                Trinity score
              </AppText>
              <AppText variant="mono" tone="tertiary">
                last 14 days
              </AppText>
            </View>
            <LineChart
              values={chartDays.map(
                (day) => ((day.health ?? 0) + (day.wealth ?? 0) + (day.relations ?? 0)) / 3,
              )}
              width={chartWidth}
              height={180}
              maxValue={100}
              startLabel={chartDays[0] ? formatDate(chartDays[0].date) : undefined}
              endLabel={chartDays[chartDays.length - 1] ? formatDate(chartDays[chartDays.length - 1].date) : undefined}
            />
          </Card>

          <View style={{ gap: space.md }}>
            <SectionHeader title="Averages" />
            <StatRow>
              <Stat value={String(data.healthAvg)} label="Health" />
              <Stat value={String(data.wealthAvg)} label="Wealth" />
              <Stat value={String(data.relationsAvg)} label="Relations" />
            </StatRow>
          </View>

          <Card style={{ alignItems: 'center', gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md, alignSelf: 'stretch' }}>
              <AppText variant="headline" style={{ flex: 1 }}>
                Balance
              </AppText>
              <AppText variant="mono" tone="tertiary">
                out of 100
              </AppText>
            </View>
            <RadarChart
              data={[
                { label: 'Health', value: data.healthAvg },
                { label: 'Wealth', value: data.wealthAvg },
                { label: 'Relations', value: data.relationsAvg },
              ]}
              size={220}
            />
          </Card>

          {scatterPoints.length > 1 ? (
            <Card style={{ gap: space.md }}>
              <SectionHeader title="Sleep vs mood" caption="Each dot is a day" />
              <ScatterChart
                points={scatterPoints}
                width={chartWidth}
                xMax={10}
                yMax={10}
                xLabel="Sleep, hours"
                yLabel="Mood, 0–10"
              />
            </Card>
          ) : null}

          <View style={{ gap: space.md }}>
            <SectionHeader title="Daily readings" />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <AppText variant="footnote" tone="tertiary" style={{ flex: 1 }}>
                Reading
              </AppText>
              <AppText variant="footnote" tone="tertiary" style={{ width: 72, textAlign: 'right' }}>
                Average
              </AppText>
              <AppText variant="footnote" tone="tertiary" style={{ width: 64, textAlign: 'right' }}>
                Latest
              </AppText>
            </View>
            {[
              { label: 'Sleep, hours', average: data.sleepAvg, latest: latest('sleep'), format: (v: number) => v.toFixed(1) },
              { label: 'Steps', average: data.stepsAvg, latest: latest('steps'), format: (v: number) => formatNumber(v) },
              { label: 'Mood, 0–10', average: data.moodAvg, latest: latest('mood'), format: (v: number) => v.toFixed(1) },
            ].map((row) => (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  gap: space.md,
                  paddingVertical: space.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.separator,
                }}
              >
                <AppText variant="callout" style={{ flex: 1 }}>
                  {row.label}
                </AppText>
                <AppText
                  variant="callout"
                  tone="secondary"
                  style={{ width: 72, textAlign: 'right', fontVariant: ['tabular-nums'] }}
                >
                  {row.average ? row.format(row.average) : '—'}
                </AppText>
                <AppText
                  variant="callout"
                  style={{ width: 64, textAlign: 'right', fontVariant: ['tabular-nums'] }}
                >
                  {row.latest !== null ? row.format(row.latest) : '—'}
                </AppText>
              </View>
            ))}
          </View>

          <SectionHeader title="What matters most" caption="Correlation with mood" />
          {moodCorrelations.length === 0 ? (
            <EmptyState
              icon="chart"
              title="Not enough signal yet"
              message="Log sleep, steps and mood for a few more days; the ranking appears with enough paired days."
            />
          ) : (
            <Card style={{ gap: space.lg }}>
              {moodCorrelations.map((item) => (
                <View key={item.label} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {item.label.replace(' vs mood', '')}
                    </AppText>
                    <AppText
                      variant="footnote"
                      tone={item.value >= 0 ? 'success' : 'danger'}
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {item.value.toFixed(2)}
                    </AppText>
                  </View>
                  <Progress
                    value={Math.abs(item.value) * 100}
                    color={item.value >= 0 ? colors.primary : colors.danger}
                  />
                </View>
              ))}
            </Card>
          )}

          <SectionHeader title="Correlations" />
          {data.correlations.length === 0 ? (
            <EmptyState
              icon="chart"
              title="Not enough signal yet"
              message="Keep logging for a few more days; correlations appear once there is enough paired data."
            />
          ) : (
            <Card style={{ gap: space.lg }}>
              {data.correlations.map((item) => (
                <View key={item.label} style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {item.label}
                    </AppText>
                    <AppText
                      variant="footnote"
                      style={{ fontVariant: ['tabular-nums'] }}
                      tone={item.value >= 0 ? 'success' : 'danger'}
                    >
                      {item.value.toFixed(2)}
                    </AppText>
                  </View>
                  <AppText variant="footnote" tone="secondary">
                    {item.note}
                  </AppText>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}
