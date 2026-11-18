import { Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { EnvironmentCard } from '@/features/dashboard/environment-card';
import { useHealth } from '@/features/health/use-health';
import { useProfile } from '@/features/profile/use-profile';
import { formatNumber, isoDate, startOfDay } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { radius, space, useTheme } from '@/theme';

const formatTarget = (value: number, suffix: string) => {
  if (suffix === 'K' && value >= 1000) {
    const scaled = value / 1000;
    return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}K`;
  }
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
};

const ConcentricRings = ({
  values,
  colors,
  size,
}: {
  values: number[];
  colors: string[];
  size: number;
}) => {
  const { colors: theme } = useTheme();
  const mid = size / 2;
  const stroke = 9;
  const gap = 7;
  const outerRadius = mid - stroke / 2;
  const circumference = (radius: number) => 2 * Math.PI * radius;

  return (
    <Svg width={size} height={size}>
      {values.map((value, index) => {
        const radius = outerRadius - index * (stroke + gap);
        return (
          <Circle
            key={index}
            cx={mid}
            cy={mid}
            r={radius}
            stroke={theme.surfaceSunken}
            strokeWidth={stroke}
            fill="none"
          />
        );
      })}
      {values.map((value, index) => {
        const radius = outerRadius - index * (stroke + gap);
        const length = circumference(radius);
        const ratio = Math.max(0, Math.min(1, value / 100));
        return (
          <Circle
            key={`progress-${index}`}
            cx={mid}
            cy={mid}
            r={radius}
            stroke={colors[index]}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length - length * ratio}
            rotation={-90}
            origin={`${mid}, ${mid}`}
          />
        );
      })}
    </Svg>
  );
};

const VitalRow = ({
  color,
  label,
  value,
  target,
  percent,
  last,
}: {
  color: string;
  label: string;
  value: string;
  target: string;
  percent: number;
  last?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.separator,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <AppText variant="callout" style={{ flex: 1 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <AppText variant="callout" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {value}
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          / {target}
        </AppText>
      </View>
      <AppText
        variant="callout"
        style={{ color, fontWeight: '700', width: 56, textAlign: 'right' }}
        numberOfLines={1}
      >
        {percent}%
      </AppText>
    </View>
  );
};

export const OverviewSegment = () => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
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

  const stepPercent = Math.round(Math.min(stepsToday / stepTarget, 1) * 100);
  const movePercent = Math.round(Math.min(exerciseMinutes / 30, 1) * 100);
  const sleepPercent = Math.round(Math.min(lastSleep / sleepTarget, 1) * 100);
  const waterPercent = Math.round(Math.min(water / waterTarget, 1) * 100);

  const sleepColor = 'rgba(198, 242, 78, 0.50)';
  const waterColor = '#7FA8FF';
  const ringColors = [colors.primary, colors.bonds, sleepColor, waterColor];
  const vitals = [
    {
      label: 'Steps',
      value: formatNumber(stepsToday),
      target: formatTarget(stepTarget, 'K'),
      percent: stepPercent,
      color: colors.primary,
    },
    {
      label: 'Move',
      value: `${Math.round(exerciseMinutes)}m`,
      target: '30m',
      percent: movePercent,
      color: colors.bonds,
    },
    {
      label: 'Sleep',
      value: `${lastSleep.toFixed(1)}h`,
      target: `${sleepTarget}h`,
      percent: sleepPercent,
      color: sleepColor,
    },
    {
      label: 'Water',
      value: `${(water / 1000).toFixed(1)}L`,
      target: `${(waterTarget / 1000).toFixed(waterTarget % 1000 === 0 ? 0 : 1)}L`,
      percent: waterPercent,
      color: waterColor,
    },
  ];

  // A ring within rounding distance of its target does not get called out.
  const unfinished = vitals.filter((vital) => vital.percent < 95).map((vital) => vital.label);
  const status =
    unfinished.length === 0
      ? 'Every ring is closed.'
      : unfinished.length === 1
        ? `${unfinished[0]} is the only ring left to close.`
        : `${unfinished.slice(0, -1).join(', ')} and ${unfinished[unfinished.length - 1]} are left to close.`;

  const burnedPercent = Math.min(100, Math.max(0, (caloriesBurned / calorieTarget) * 100));
  const eatenPercent = Math.min(
    100 - burnedPercent,
    Math.max(0, (caloriesEaten / calorieTarget) * 100),
  );
  const caloriesLeft = Math.max(0, calorieTarget - caloriesEaten);

  return (
    <View style={{ gap: space.sm }}>
      <Panel style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: space.xs }}>
            <AppText variant="caption" tone="tertiary">
              Activity score
            </AppText>
            <AppText
              variant="display"
              style={{ color: colors.primary, fontSize: 54, lineHeight: 58, letterSpacing: -2.5 }}
            >
              {activityScore}
            </AppText>
            <AppText variant="footnote" tone="secondary">
              {status}
            </AppText>
          </View>
          <ConcentricRings
            values={[stepPercent, movePercent, sleepPercent, waterPercent]}
            colors={ringColors}
            size={fontScale > 1.15 ? 118 : 134}
          />
        </View>
      </Panel>

      <Panel padded={false} style={{ paddingHorizontal: space.lg }}>
        {vitals.map((vital, index) => (
          <VitalRow
            key={vital.label}
            {...vital}
            last={index === vitals.length - 1}
          />
        ))}
      </Panel>

      <Panel style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <AppText variant="headline">Energy balance</AppText>
          <AppText variant="footnote" tone="tertiary">
            of {formatNumber(calorieTarget)} kcal
          </AppText>
        </View>

        <View
          style={{
            height: 8,
            borderRadius: radius.pill,
            overflow: 'hidden',
            flexDirection: 'row',
            backgroundColor: colors.surfaceSunken,
          }}
        >
          <View style={{ width: `${burnedPercent}%`, backgroundColor: colors.bonds }} />
          <View style={{ width: `${eatenPercent}%`, backgroundColor: colors.primary }} />
        </View>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" tone="tertiary">
              Burned
            </AppText>
            <AppText
              variant="numeric"
              style={{ color: colors.bonds, fontSize: 24, lineHeight: 28, letterSpacing: -1 }}
            >
              {formatNumber(caloriesBurned)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" tone="tertiary">
              Eaten
            </AppText>
            <AppText
              variant="numeric"
              style={{ color: colors.primary, fontSize: 24, lineHeight: 28, letterSpacing: -1 }}
            >
              {formatNumber(caloriesEaten)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" tone="tertiary">
              Left
            </AppText>
            <AppText
              variant="numeric"
              style={{ fontSize: 24, lineHeight: 28, letterSpacing: -1 }}
            >
              {formatNumber(caloriesLeft)}
            </AppText>
          </View>
        </View>
      </Panel>

      <EnvironmentCard />

      <Panel style={{ gap: space.md, paddingVertical: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="headline" style={{ flex: 1 }}>
            Goals
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add goal"
            onPress={() => openAdd('goal')}
            hitSlop={10}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <AppText variant="caption" tone="primary">
              + New goal
            </AppText>
          </Pressable>
        </View>

        {otherGoals.length === 0 ? (
          <AppText variant="footnote" tone="secondary">
            Daily steps and sleep are tracked in the rings above.
          </AppText>
        ) : (
          otherGoals.map((goal) => {
            const target = goal.target_value ?? 0;
            const current = goal.current_value ?? 0;
            const percent = target > 0 ? (current / target) * 100 : 0;
            const complete = percent >= 100;
            return (
              <View key={goal.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: complete ? colors.primary : 'transparent',
                    borderWidth: complete ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  {complete ? (
                    <Icon name="check" size={18} color={colors.onPrimary} />
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
                  >
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {goal.title}
                    </AppText>
                    <AppText variant="footnote" tone="secondary">
                      {formatNumber(current)} / {formatNumber(target)}
                    </AppText>
                  </View>
                  <Progress value={percent} height={4} />
                </View>
              </View>
            );
          })
        )}
      </Panel>
    </View>
  );
};
