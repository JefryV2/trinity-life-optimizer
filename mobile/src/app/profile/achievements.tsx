import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useHealth } from '@/features/health/use-health';
import { useRelations } from '@/features/relations/use-relations';
import { useWealth } from '@/features/wealth/use-wealth';
import { formatNumber } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

interface Achievement {
  title: string;
  body: string;
  icon: IconName;
  current: number;
  target: number;
}

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const health = useHealth();
  const wealth = useWealth();
  const relations = useRelations();
  const pending = health.isPending || wealth.isPending || relations.isPending;
  const failed = health.error ?? wealth.error ?? relations.error;

  const stepsTotal = (health.data?.steps ?? []).reduce((total, row) => total + Number(row.steps ?? 0), 0);
  const workouts = health.data?.exercise.length ?? 0;
  const meals = health.data?.food.length ?? 0;
  const transactions = wealth.data?.transactions.length ?? 0;
  const people = relations.data?.relationships.length ?? 0;
  const gratitude = relations.data?.gratitude.length ?? 0;

  const achievements: Achievement[] = [
    { title: 'First steps', body: 'Record 10,000 steps total.', icon: 'run', current: stepsTotal, target: 10000 },
    { title: 'Training rhythm', body: 'Log 10 workouts.', icon: 'dumbbell', current: workouts, target: 10 },
    { title: 'Nutrition awareness', body: 'Log 20 food entries.', icon: 'food', current: meals, target: 20 },
    { title: 'Money clarity', body: 'Log 25 transactions.', icon: 'wallet', current: transactions, target: 25 },
    { title: 'Inner circle', body: 'Add 5 important people.', icon: 'people', current: people, target: 5 },
    { title: 'Gratitude habit', body: 'Write 7 gratitude entries.', icon: 'gift', current: gratitude, target: 7 },
  ];

  const retry = () => {
    void health.refetch();
    void wealth.refetch();
    void relations.refetch();
  };

  return (
    <Screen safeAreaTop={false}>
      {pending ? <LoadingState rows={4} /> : null}
      {failed ? <ErrorState message={failed.message} onRetry={retry} /> : null}

      <SectionHeader title="Achievements" caption="Computed from your current records; no fake streaks." />
      <View style={{ gap: space.lg }}>
        {achievements.map((achievement) => {
          const percent = achievement.target > 0 ? (achievement.current / achievement.target) * 100 : 0;
          const done = percent >= 100;
          return (
            <Card key={achievement.title} style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.inner,
                    backgroundColor: done ? colors.surfaceAlt : colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={done ? 'check' : achievement.icon} size={20} color={done ? colors.success : colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="headline">{achievement.title}</AppText>
                  <AppText variant="footnote" tone="secondary">
                    {achievement.body}
                  </AppText>
                </View>
                <AppText variant="caption" tone={done ? 'success' : 'tertiary'}>
                  {done ? 'Done' : `${formatNumber(achievement.current)}/${formatNumber(achievement.target)}`}
                </AppText>
              </View>
              <Progress value={percent} color={done ? colors.success : colors.primary} />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}