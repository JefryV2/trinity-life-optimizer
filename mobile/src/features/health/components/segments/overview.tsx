import { View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { LogStrip, type LogAction } from '@/components/ui/log-strip';
import { Progress } from '@/components/ui/progress';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useHealth } from '@/features/health/use-health';
import { useProfile } from '@/features/profile/use-profile';
import { formatNumber, isoDate, startOfDay } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

export const OverviewSegment = () => {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, addWater } = useHealth();
  const { data: profileData } = useProfile();

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const today = isoDate();
  const dayStart = startOfDay().getTime();
  const stepsToday = data.steps.find((record) => record.date === today)?.steps ?? 0;
  const exerciseToday = data.exercise.filter(
    (record) => record.completed_at && new Date(record.completed_at).getTime() >= dayStart,
  );
  const exerciseMinutes = exerciseToday.reduce(
    (sum, record) => sum + (record.duration_minutes ?? 0),
    0,
  );
  const caloriesBurned = exerciseToday.reduce(
    (sum, record) => sum + (record.calories_burned ?? 0),
    0,
  );
  const caloriesEaten = data.food.reduce((sum, entry) => sum + (entry.total_calories ?? 0), 0);
  const lastSleep = data.sleep[0]?.sleep_duration_hours ?? 0;

  const activityScore = Math.round(
    Math.min(stepsToday / 10000, 1) * 45 +
      Math.min(exerciseMinutes / 30, 1) * 25 +
      Math.min(lastSleep / 8, 1) * 30,
  );

  const calorieTarget = profileData?.health?.daily_caloric_target ?? 2000;
  const water = data.hydration?.water_intake_ml ?? 0;
  const waterTarget = data.hydration?.target_ml ?? 2500;

  const logActions: LogAction[] = [
    { icon: 'bed', label: 'Sleep', onPress: () => openAdd('sleep') },
    { icon: 'dumbbell', label: 'Workout', onPress: () => openAdd('exercise') },
    { icon: 'food', label: 'Food', onPress: () => openAdd('food') },
    {
      icon: 'water',
      label: 'Water',
      primary: true,
      loading: addWater.isPending,
      onPress: () =>
        addWater.mutate(250, {
          onSuccess: () => {
          },
        }),
    },
  ];

  return (
    <>
      <Card raised style={{ gap: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
          <RingMeter value={activityScore} max={100} size={96} stroke={6} center={String(activityScore)} label="Activity" />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="headline">Today's activity</AppText>
            <AppText variant="footnote" tone="secondary">
              Steps, movement and sleep, weighted.
            </AppText>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: space.sm,
            paddingTop: space.sm,
          }}
        >
          <RingMeter
            value={stepsToday}
            max={10000}
            color={colors.primary}
            center={`${Math.round(Math.min(1, stepsToday / 10000) * 100)}%`}
            label="Steps"
          />
          <RingMeter
            value={exerciseMinutes}
            max={30}
            color={colors.primary}
            center={`${Math.round(exerciseMinutes)}m`}
            label="Move"
          />
          <RingMeter
            value={lastSleep}
            max={8}
            color={colors.primary}
            center={lastSleep.toFixed(1)}
            label="Sleep"
          />
          <RingMeter
            value={water}
            max={waterTarget}
            color={colors.primary}
            center={`${Math.round(Math.min(1, water / waterTarget) * 100)}%`}
            label="Water"
          />
        </View>
      </Card>

      <StatRow>
        <Stat value={formatNumber(stepsToday)} label="Steps" />
        <Stat value={String(exerciseMinutes)} label="Active min" />
      </StatRow>
      <StatRow>
        <Stat value={formatNumber(caloriesEaten)} label="Eaten, kcal" />
        <Stat value={formatNumber(caloriesBurned)} label="Burned, kcal" />
      </StatRow>

      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
            <AppText variant="callout">Energy balance</AppText>
            <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
              {formatNumber(caloriesEaten)} / {formatNumber(calorieTarget)} kcal
            </AppText>
          </View>
          <Progress
            value={(caloriesEaten / calorieTarget) * 100}
            color={caloriesEaten > calorieTarget ? colors.danger : colors.primary}
          />
        </View>
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
            <AppText variant="callout">Hydration</AppText>
            <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
              {formatNumber(water)} / {formatNumber(waterTarget)} ml
            </AppText>
          </View>
          <Progress value={(water / waterTarget) * 100} />
        </View>
      </Card>

      <SectionHeader title="Goals" actionLabel="New goal" onAction={() => openAdd('goal')} />
      {data.goals.length === 0 ? (
        <EmptyState
          icon="target"
          title="No goals yet"
          message="Set one reachable number — steps, sleep, water — and watch it fill up."
          actionLabel="Create a goal"
          onAction={() => openAdd('goal')}
        />
      ) : (
        <Card style={{ gap: space.lg }}>
          {data.goals.map((goal) => {
            const percent =
              goal.target_value && goal.target_value > 0
                ? ((goal.current_value ?? 0) / goal.target_value) * 100
                : 0;
            return (
              <View key={goal.id} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                  <AppText variant="callout" style={{ flex: 1 }}>
                    {goal.title}
                  </AppText>
                  <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatNumber(goal.current_value ?? 0)} / {formatNumber(goal.target_value ?? 0)}{' '}
                    {goal.unit ?? ''}
                  </AppText>
                </View>
                <Progress value={percent} />
              </View>
            );
          })}
        </Card>
      )}

      <LogStrip items={logActions} />
    </>
  );
};
