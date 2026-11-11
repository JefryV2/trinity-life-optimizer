import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeletableRow } from '@/components/ui/deletable-row';
import { Progress } from '@/components/ui/progress';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useHealth } from '@/features/health/use-health';
import { usePedometer } from '@/features/health/use-pedometer';
import { formatDate, formatNumber, isoDate } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space } from '@/theme';

export const FitnessSegment = () => {
  const router = useRouter();
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();
  const pedometer = usePedometer();

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const today = isoDate();
  const stepsToday = pedometer.tracking
    ? pedometer.liveSteps
    : data.steps.find((record) => record.date === today)?.steps ?? 0;
  const stepHistory = [...data.steps]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((record) => ({
      label: String(new Date(record.date + 'T12:00:00').getDate()),
      value: record.steps,
    }));

  return (
    <>
      <Card raised style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <AppText variant="numeric">{formatNumber(stepsToday)}</AppText>
          <AppText variant="footnote" tone="secondary">
            of 10,000 steps
          </AppText>
        </View>
        <Progress value={(stepsToday / 10000) * 100} height={6} />
        <AppText variant="footnote" tone="tertiary">
          {stepsToday >= 10000
            ? 'Target reached.'
            : `${formatNumber(10000 - stepsToday)} steps to target.`}
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label="Walk with GPS" size="small" onPress={() => router.push('/walk' as never)} />
          <Button label="Set steps" variant="secondary" size="small" onPress={() => openAdd('steps')} />
          <Button label="Log workout" variant="secondary" size="small" onPress={() => openAdd('exercise')} />
          {pedometer.tracking ? (
            <Button label="Stop sensor" variant="secondary" size="small" onPress={pedometer.stop} />
          ) : (
            <Button label="Use sensor" variant="secondary" size="small" onPress={() => void pedometer.start()} />
          )}
        </View>
        {pedometer.message ? (
          <AppText variant="footnote" tone="secondary">
            {pedometer.message}
          </AppText>
        ) : null}
      </Card>

      {stepHistory.length > 1 ? (
        <Card style={{ gap: space.md }}>
          <SectionHeader title="Steps" caption="Last 14 recorded days" />
          <BarChart data={stepHistory} />
        </Card>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Workouts" actionLabel="Add" onAction={() => openAdd('exercise')} />
        {data.exercise.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="No sessions yet"
            message="Log a workout to see weekly volume."
            actionLabel="Log exercise"
            onAction={() => openAdd('exercise')}
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: space.xl }}>
            {data.exercise.map((record, index) => (
              <DeletableRow
                key={record.id}
                icon="run"
                title={record.exercise_name}
                subtitle={`${record.completed_at ? formatDate(record.completed_at) : 'Recent'} · ${record.intensity ?? 'moderate'}${record.calories_burned ? ` · ${record.calories_burned} kcal` : ''}`}
                value={`${record.duration_minutes ?? 0} min`}
                last={index === data.exercise.length - 1}
                onDelete={() => deleteRecord.mutate({ table: 'exercise_records', id: record.id })}
              />
            ))}
          </Card>
        )}
      </View>
    </>
  );
};