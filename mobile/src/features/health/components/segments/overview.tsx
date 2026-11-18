import { useWindowDimensions, View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { EnvironmentCard } from '@/features/dashboard/environment-card';
import { useHealth } from '@/features/health/use-health';
import { useProfile } from '@/features/profile/use-profile';
import { formatNumber, isoDate, startOfDay } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

export const OverviewSegment = () => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const stackRow = fontScale > 1.15;
  const { data, isPending, isError, error, refetch } = useHealth();
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

  const calorieTarget = profileData?.health?.daily_caloric_target ?? 2000;
  const water = data.hydration?.water_intake_ml ?? 0;
  const waterTarget = data.hydration?.target_ml ?? 2500;

  const stepGoal = data.goals.find(
    (goal) => goal.goal_type === 'activity' && goal.unit === 'steps' && (goal.target_value ?? 0) > 0,
  );
  const sleepGoal = data.goals.find(
    (goal) => goal.goal_type === 'sleep' && (goal.target_value ?? 0) > 0,
  );
  const stepTarget = stepGoal?.target_value ?? 10000;
  const sleepTarget = sleepGoal?.target_value ?? 8;
  const otherGoals = data.goals.filter(
    (goal) => goal.id !== stepGoal?.id && goal.id !== sleepGoal?.id,
  );

  const activityScore = Math.round(
    Math.min(stepsToday / stepTarget, 1) * 45 +
      Math.min(exerciseMinutes / 30, 1) * 25 +
      Math.min(lastSleep / sleepTarget, 1) * 30,
  );

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
            max={stepTarget}
            color={colors.primary}
            center={formatNumber(stepsToday)}
            label="Steps"
            sublabel={`of ${(stepTarget / 1000).toFixed(stepTarget % 1000 === 0 ? 0 : 1)}k`}
          />
          <RingMeter
            value={exerciseMinutes}
            max={30}
            color={colors.primary}
            center={`${Math.round(exerciseMinutes)}m`}
            label="Move"
            sublabel="of 30m"
          />
          <RingMeter
            value={lastSleep}
            max={sleepTarget}
            color={colors.primary}
            center={lastSleep.toFixed(1)}
            label="Sleep"
            sublabel={`of ${sleepTarget}h`}
          />
          <RingMeter
            value={water}
            max={waterTarget}
            color={colors.primary}
            center={`${(water / 1000).toFixed(1)}L`}
            label="Water"
            sublabel={`of ${(waterTarget / 1000).toFixed(waterTarget % 1000 === 0 ? 0 : 1)}L`}
          />
        </View>
      </Card>

      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <View
            style={{
              flexDirection: stackRow ? 'column' : 'row',
              alignItems: stackRow ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: stackRow ? 2 : space.md,
            }}
          >
            <AppText variant="callout">Energy balance</AppText>
            <AppText
              variant="footnote"
              tone="secondary"
              style={[{ fontVariant: ['tabular-nums'] }, stackRow ? null : { textAlign: 'right' }]}
            >
              {formatNumber(caloriesEaten)} / {formatNumber(calorieTarget)} kcal
            </AppText>
          </View>
          <Progress
            value={(caloriesEaten / calorieTarget) * 100}
            color={caloriesEaten > calorieTarget ? colors.danger : colors.primary}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
            <AppText variant="caption" tone="tertiary">
              {formatNumber(caloriesBurned)} burned
            </AppText>
            <AppText variant="caption" tone="tertiary">
              {formatNumber(Math.max(0, calorieTarget - caloriesEaten))} kcal left
            </AppText>
          </View>
        </View>
      </Card>

      <EnvironmentCard />

      <SectionHeader title="Goals" actionLabel="New goal" onAction={() => openAdd('goal')} />
      {otherGoals.length === 0 ? (
        data.goals.length > 0 ? (
          <Card>
            <AppText variant="footnote" tone="secondary">
              Daily steps and sleep targets are in the rings above.
            </AppText>
          </Card>
        ) : (
          <EmptyState
            icon="target"
            title="No goals yet"
            message="Set one reachable number — steps, sleep, water — and watch it fill up."
            actionLabel="Create a goal"
            onAction={() => openAdd('goal')}
          />
        )
      ) : (
        <Card style={{ gap: space.lg }}>
          {otherGoals.map((goal) => {
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

    </>
  );
};
