import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { AppText } from '@/components/ui/app-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Panel } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import { useHealth } from '@/features/health/use-health';
import { usePedometer } from '@/features/health/use-pedometer';
import { confirmDelete } from '@/lib/confirm';
import { formatDate, formatNumber, isoDate } from '@/lib/format';
import { openAdd, openEdit } from '@/lib/navigation';
import { radius, space, useTheme } from '@/theme';

const STEP_TARGET = 10000;

const ActionPill = ({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: primary ? colors.primary : 'transparent',
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <AppText
        variant="callout"
        style={{ color: primary ? colors.onPrimary : colors.text, fontWeight: '800' }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

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
  const orderedSteps = [...data.steps].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const stepHistory = orderedSteps.map((record) => ({
    label: String(new Date(record.date + 'T12:00:00').getDate()),
    value: record.steps,
  }));
  const firstStepDate = orderedSteps[0]
    ? formatDate(`${orderedSteps[0].date}T12:00:00`)
    : undefined;
  const stepTargetLeft = Math.max(0, STEP_TARGET - stepsToday);

  return (
    <>
      <View style={{ gap: space.md }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md }}
        >
          <AppText variant="display" style={{ letterSpacing: -2 }}>
            {formatNumber(stepsToday)}
          </AppText>
          <AppText variant="footnote" tone="secondary">
            of 10,000 steps
          </AppText>
        </View>
        <Progress value={(stepsToday / STEP_TARGET) * 100} height={6} />
        <AppText variant="footnote" tone="secondary">
          {stepTargetLeft === 0
            ? 'Target reached.'
            : `${formatNumber(stepTargetLeft)} steps to target`}
        </AppText>

        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.xs }}>
          <ActionPill
            label="Walk with GPS"
            primary
            onPress={() => router.push('/walk' as never)}
          />
          <ActionPill label="Log workout" onPress={() => openAdd('exercise')} />
          <ActionPill
            label={pedometer.tracking ? 'Stop sensor' : 'Sensor'}
            onPress={() => {
              if (pedometer.tracking) pedometer.stop();
              else void pedometer.start();
            }}
          />
        </View>
        {pedometer.message ? (
          <AppText variant="footnote" tone="secondary">
            {pedometer.message}
          </AppText>
        ) : null}
      </View>

      <Panel style={{ gap: space.md }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
        >
          <AppText variant="headline">Steps</AppText>
          <AppText variant="footnote" tone="tertiary">
            Last 14 days
          </AppText>
        </View>
        {stepHistory.length > 1 ? (
          <BarChart
            data={stepHistory}
            height={150}
            targetValue={STEP_TARGET}
            highlightLast
            showLabels={false}
            startLabel={firstStepDate}
            endLabel="Today"
          />
        ) : (
          <AppText variant="footnote" tone="tertiary">
            Log a few days to see the shape of your week.
          </AppText>
        )}
      </Panel>

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="headline" style={{ flex: 1 }}>
            Workouts
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add workout"
            onPress={() => openAdd('exercise')}
            hitSlop={10}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <AppText variant="caption" tone="primary">
              Add
            </AppText>
          </Pressable>
        </View>
        {data.exercise.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="No sessions yet"
            message="Log a workout to see weekly volume."
            actionLabel="Log exercise"
            onAction={() => openAdd('exercise')}
          />
        ) : (
          data.exercise.map((record) => (
            <Pressable
              key={record.id}
              accessibilityRole="button"
              accessibilityHint="Tap to edit, long press to delete"
              onPress={() => openEdit('exercise', record.id)}
              onLongPress={() =>
                confirmDelete('workout', () =>
                  deleteRecord.mutate({ table: 'exercise_records', id: record.id }),
                )
              }
              delayLongPress={350}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <Panel style={{ gap: space.xs }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: space.md,
                  }}
                >
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="headline" numberOfLines={1}>
                      {record.exercise_name}
                    </AppText>
                    <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
                      {[
                        record.completed_at ? formatDate(record.completed_at) : 'Recent',
                        record.intensity ?? 'moderate',
                        record.calories_burned ? `${record.calories_burned} kcal` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <AppText
                      variant="numeric"
                      style={{ fontSize: 24, lineHeight: 28, letterSpacing: -1 }}
                    >
                      {record.duration_minutes ?? 0}
                    </AppText>
                    <AppText variant="footnote" tone="secondary">
                      min
                    </AppText>
                  </View>
                </View>
              </Panel>
            </Pressable>
          ))
        )}
      </View>
    </>
  );
};
