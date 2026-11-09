import * as Haptics from 'expo-haptics';
import { View } from 'react-native';

import { ScoreRing } from '@/components/charts/score-ring';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  return (
    <>
      <Card raised style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
        <ScoreRing score={activityScore} size={104} stroke={9} label="Activity" />
        <View style={{ flex: 1, gap: space.sm }}>
          <AppText variant="headline">Today's activity</AppText>
          <AppText variant="footnote" tone="secondary">
            Steps 45% · Movement 25% · Sleep 30%
          </AppText>
          <View style={{ gap: space.xs }}>
            <Progress value={Math.min(stepsToday / 10000, 1) * 100} height={6} />
            <Progress value={Math.min(exerciseMinutes / 30, 1) * 100} color={colors.accent} height={6} />
            <Progress value={Math.min(lastSleep / 8, 1) * 100} color={colors.amber} height={6} />
          </View>
        </View>
      </Card>

      <Card>
        <StatRow>
          <Stat value={formatNumber(stepsToday)} label="Steps" />
          <Stat value={String(exerciseMinutes)} label="Active min" />
          <Stat value={formatNumber(caloriesEaten)} label="Eaten (kcal)" />
          <Stat value={formatNumber(caloriesBurned)} label="Burned (kcal)" />
        </StatRow>
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="callout" style={{ fontWeight: '600' }}>
            Energy balance
          </AppText>
          <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
            {formatNumber(caloriesEaten)} / {formatNumber(calorieTarget)} kcal
          </AppText>
        </View>
        <Progress
          value={(caloriesEaten / calorieTarget) * 100}
          color={caloriesEaten > calorieTarget ? colors.danger : colors.success}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="callout" style={{ fontWeight: '600' }}>
            Hydration
          </AppText>
          <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
            {formatNumber(water)} / {formatNumber(waterTarget)} ml
          </AppText>
        </View>
        <Progress value={(water / waterTarget) * 100} color={colors.accent} />
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Health goals"
          actionLabel="New goal"
          onAction={() => openAdd('goal')}
        />
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="callout">{goal.title}</AppText>
                    <AppText variant="caption" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                      {formatNumber(goal.current_value ?? 0)} / {formatNumber(goal.target_value ?? 0)}{' '}
                      {goal.unit ?? ''}
                    </AppText>
                  </View>
                  <Progress value={percent} color={percent >= 100 ? colors.success : colors.primary} />
                </View>
              );
            })}
          </Card>
        )}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Button label="Log sleep" variant="secondary" size="small" onPress={() => openAdd('sleep')} />
        <Button label="Log workout" variant="secondary" size="small" onPress={() => openAdd('exercise')} />
        <Button label="Log food" variant="secondary" size="small" onPress={() => openAdd('food')} />
        <Button label="Check in" variant="secondary" size="small" onPress={() => openAdd('mental')} />
        <Button
          label="Water +250"
          variant="soft"
          size="small"
          loading={addWater.isPending}
          onPress={() =>
            addWater.mutate(250, {
              onSuccess: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
            })
          }
        />
      </View>
    </>
  );
};