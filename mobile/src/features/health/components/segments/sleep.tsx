import { View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeletableRow } from '@/components/ui/deletable-row';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useHealth } from '@/features/health/use-health';
import { formatDate } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space } from '@/theme';

export const SleepSegment = () => {
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const week = data.sleep.slice(0, 7);
  const avgHours = week.length
    ? week.reduce((sum, record) => sum + (record.sleep_duration_hours ?? 0), 0) / week.length
    : 0;
  const avgQuality = week.length
    ? week.reduce((sum, record) => sum + (record.sleep_quality ?? 0), 0) / week.length
    : 0;

  const chart = [...week]
    .reverse()
    .map((record) => ({
      label: formatDate(record.created_at),
      value: record.sleep_duration_hours ?? 0,
    }));

  return (
    <>
      <Card raised style={{ gap: space.lg }}>
        <StatRow>
          <Stat value={avgHours > 0 ? avgHours.toFixed(1) : '—'} label="Avg hours, 7d" tone={avgHours >= 7 ? 'success' : 'default'} />
          <Stat value={avgQuality > 0 ? avgQuality.toFixed(1) : '—'} label="Quality, /10" />
          <Stat value={String(data.sleep.length)} label="Records" />
        </StatRow>
        <AppText variant="footnote" tone="secondary">
          {avgHours === 0
            ? 'Log last night to start the trend.'
            : avgHours >= 7
              ? 'Above the 7-hour target.'
              : `${(7 - avgHours).toFixed(1)} hours below the 7-hour target.`}
        </AppText>
        <Button label="Log sleep" onPress={() => openAdd('sleep')} />
      </Card>

      {chart.length > 1 ? (
        <Card style={{ gap: space.md }}>
          <SectionHeader title="Duration" caption="Target: 7–9 hours" />
          <BarChart data={chart} maxValue={10} />
        </Card>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="History" />
        {data.sleep.length === 0 ? (
          <EmptyState
            icon="moon"
            title="No sleep records"
            message="Log a night to start the trend."
            actionLabel="Log last night"
            onAction={() => openAdd('sleep')}
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: space.xl }}>
            {data.sleep.map((record, index) => (
              <DeletableRow
                key={record.id}
                icon="moon"
                title={`${(record.sleep_duration_hours ?? 0).toFixed(1)} hours`}
                subtitle={`${formatDate(record.created_at)}${record.notes ? ` · ${record.notes}` : ''}`}
                value={`Quality ${record.sleep_quality ?? '—'}/10`}
                last={index === data.sleep.length - 1}
                onDelete={() => deleteRecord.mutate({ table: 'sleep_records', id: record.id })}
              />
            ))}
          </Card>
        )}
      </View>
    </>
  );
};