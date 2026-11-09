import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { RadarChart } from '@/components/charts/radar-chart';
import { Sparkline } from '@/components/charts/sparkline';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useInsights } from '@/features/insights/use-insights';
import { formatDate, formatNumber } from '@/lib/format';
import { space, useTheme } from '@/theme';

const values = (items: Array<number | null>) => items.map((value) => value ?? 0);

export default function InsightsScreen() {
  const { colors } = useTheme();
  const [range, setRange] = useState<'7' | '30'>('30');
  const { data, isPending, isError, error, refetch, isRefetching } = useInsights(range === '7' ? 7 : 30);

  const chartDays = data?.days.slice(-14) ?? [];

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
          <Card raised style={{ alignItems: 'center', gap: space.lg }}>
            <RadarChart
              data={[
                { label: 'Health', value: data.healthAvg },
                { label: 'Wealth', value: data.wealthAvg },
                { label: 'Relations', value: data.relationsAvg },
              ]}
            />
            <StatRow>
              <Stat value={String(data.healthAvg)} label="Health avg" tone="primary" />
              <Stat value={String(data.wealthAvg)} label="Wealth avg" />
              <Stat value={String(data.relationsAvg)} label="Relations avg" tone="success" />
            </StatRow>
          </Card>

          <Card style={{ gap: space.lg }}>
            <SectionHeader title="Pillar trend" caption={`Last ${Math.min(14, range === '7' ? 7 : 30)} recorded days`} />
            <BarChart
              data={chartDays.map((day) => ({
                label: formatDate(day.date).replace(/\D/g, '') || day.date.slice(-2),
                value: Math.round(((day.health ?? 0) + (day.wealth ?? 0) + (day.relations ?? 0)) / 3),
              }))}
              maxValue={100}
              color={colors.primary}
              height={150}
            />
          </Card>

          <View style={{ gap: space.lg }}>
            <TrendCard title="Sleep" value={`${data.sleepAvg || '—'} h`} values={values(data.days.map((day) => day.sleep))} color={colors.accent} />
            <TrendCard title="Steps" value={formatNumber(data.stepsAvg)} values={values(data.days.map((day) => day.steps))} color={colors.primary} />
            <TrendCard title="Mood" value={data.moodAvg ? data.moodAvg.toFixed(1) : '—'} values={values(data.days.map((day) => day.mood))} color={colors.success} />
          </View>

          <SectionHeader title="Correlations" caption="Only shown when the signal is meaningful" />
          {data.correlations.length === 0 ? (
            <EmptyState
              icon="chart"
              title="Not enough signal yet"
              message="Keep logging for a few more days; correlations appear once there is enough paired data."
            />
          ) : (
            <Card style={{ gap: space.lg }}>
              {data.correlations.map((item) => (
                <View key={item.label} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {item.label}
                    </AppText>
                    <AppText variant="footnote" tone={item.value >= 0 ? 'success' : 'danger'}>
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

const TrendCard = ({
  title,
  value,
  values,
  color,
}: {
  title: string;
  value: string;
  values: number[];
  color: string;
}) => (
  <Card style={{ gap: space.md }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <AppText variant="headline">{title}</AppText>
      <AppText variant="numeric" style={{ fontSize: 24 }}>
        {value}
      </AppText>
    </View>
    <Sparkline values={values} color={color} height={64} />
  </Card>
);