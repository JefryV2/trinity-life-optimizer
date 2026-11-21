import { View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useHealth } from '@/features/health/use-health';
import { useRelations } from '@/features/relations/use-relations';
import { useWealth } from '@/features/wealth/use-wealth';
import { formatNumber } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { fonts, radius, space, useTheme } from '@/theme';

interface Achievement {
  title: string;
  body: string;
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

  const stepsTotal = (health.data?.steps ?? []).reduce(
    (total, row) => total + Number(row.steps ?? 0),
    0,
  );
  const workouts = health.data?.exercise.length ?? 0;
  const meals = health.data?.food.length ?? 0;
  const transactions = wealth.data?.transactions.length ?? 0;
  const people = relations.data?.relationships.length ?? 0;
  const gratitude = relations.data?.gratitude.length ?? 0;

  const achievements: Achievement[] = [
    { title: 'First steps', body: 'Record 10,000 steps total.', current: stepsTotal, target: 10000 },
    { title: 'Training rhythm', body: 'Log 10 workouts.', current: workouts, target: 10 },
    { title: 'Nutrition awareness', body: 'Log 20 food entries.', current: meals, target: 20 },
    { title: 'Money clarity', body: 'Log 25 transactions.', current: transactions, target: 25 },
    { title: 'Inner circle', body: 'Add 5 important people.', current: people, target: 5 },
    { title: 'Gratitude habit', body: 'Write 7 gratitude entries.', current: gratitude, target: 7 },
  ];

  const percentFor = (achievement: Achievement) =>
    achievement.target > 0 ? (achievement.current / achievement.target) * 100 : 0;
  const unlocked = achievements.filter((achievement) => percentFor(achievement) >= 100);
  const inProgress = achievements.filter((achievement) => percentFor(achievement) < 100);
  const almost = [...inProgress].sort((a, b) => percentFor(b) - percentFor(a))[0];
  const almostPercent = almost ? Math.min(100, Math.round(percentFor(almost))) : 0;
  const progressList = [...inProgress]
    .filter((achievement) => achievement !== almost)
    .sort((a, b) => percentFor(b) - percentFor(a));
  if (almost) progressList.push(almost);

  const retry = () => {
    void health.refetch();
    void wealth.refetch();
    void relations.refetch();
  };

  return (
    <Screen safeAreaTop={false}>
      {pending ? <LoadingState rows={4} /> : null}
      {failed ? <ErrorState message={failed.message} onRetry={retry} /> : null}

      {!pending && !failed ? (
        <>
          <Panel style={{ gap: space.sm }}>
            <AppText variant="caption" tone="tertiary">
              MILESTONES
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <AppText variant="display" style={{ fontSize: 48, lineHeight: 50 }}>
                {unlocked.length}
              </AppText>
              <AppText variant="callout" tone="secondary">
                of {achievements.length} unlocked
              </AppText>
            </View>
            <AppText variant="footnote" tone="tertiary">
              Everything you have logged so far
            </AppText>
            <View style={{ flexDirection: 'row', gap: 3, paddingTop: space.xs }}>
              {achievements.map((achievement, index) => (
                <View
                  key={achievement.title}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: radius.segment,
                    backgroundColor:
                      index < unlocked.length ? colors.primary : colors.surfaceSunken,
                  }}
                />
              ))}
            </View>
          </Panel>

          {almost ? (
            <Panel
              background={colors.primarySoft}
              style={{
                gap: space.md,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(198, 242, 78, 0.26)',
              }}
            >
              <RingMeter
                value={almostPercent}
                max={100}
                size={74}
                stroke={7}
                color={colors.primary}
                center={`${almostPercent}%`}
                centerSize={18}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="caption" tone="primary">
                  ALMOST THERE
                </AppText>
                <AppText style={{ fontFamily: fonts.black, fontSize: 24, lineHeight: 28 }}>
                  {almost.title}
                </AppText>
                <AppText variant="footnote" tone="secondary">
                  {`${almost.body.replace(/\.$/, '')} · ${formatNumber(almost.current)} / ${formatNumber(almost.target)}`}
                </AppText>
                <View style={{ alignSelf: 'flex-start', paddingTop: space.xs }}>
                  <Button
                    label={almost.title === 'Training rhythm' ? 'Log a workout' : 'Keep going'}
                    size="small"
                    onPress={() =>
                      openAdd(almost.title === 'Training rhythm' ? 'exercise' : 'gratitude')
                    }
                  />
                </View>
              </View>
            </Panel>
          ) : null}

          {inProgress.length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <AppText style={{ fontFamily: fonts.black, fontSize: 26, lineHeight: 30 }}>
                  In progress
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  {inProgress.length} total
                </AppText>
              </View>
              {progressList.map((achievement) => {
                const percent = Math.min(100, Math.round(percentFor(achievement)));
                const segments = Math.min(30, Math.ceil(achievement.target));
                const filled = Math.min(segments, Math.round(achievement.current));
                return (
                  <Panel key={achievement.title} style={{ gap: space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText style={{ fontFamily: fonts.bold, fontSize: 18, lineHeight: 22 }}>
                          {achievement.title}
                        </AppText>
                        <AppText variant="footnote" tone="tertiary">
                          {achievement.body}
                        </AppText>
                      </View>
                      <View
                        style={{
                          borderRadius: radius.pill,
                          backgroundColor: colors.surfaceSunken,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                      >
                        <AppText variant="caption" tone="secondary">
                          {`${formatNumber(
                            Math.max(0, achievement.target - achievement.current),
                          )} to go`}
                        </AppText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <AppText variant="numeric" style={{ fontSize: 44, lineHeight: 46 }}>
                        {formatNumber(achievement.current)}
                      </AppText>
                      <AppText variant="callout" tone="tertiary">
                        /{formatNumber(achievement.target)}
                      </AppText>
                      <View style={{ flex: 1 }} />
                      <AppText
                        style={{
                          fontFamily: fonts.bold,
                          fontSize: 18,
                          lineHeight: 22,
                          color: colors.bonds,
                        }}
                      >
                        {percent}%
                      </AppText>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      {Array.from({ length: segments }).map((_, index) => (
                        <View
                          key={`${achievement.title}-${index}`}
                          style={{
                            flex: 1,
                            height: 20,
                            borderRadius: radius.segment,
                            backgroundColor:
                              index < filled ? colors.bonds : colors.surfaceSunken,
                          }}
                        />
                      ))}
                    </View>
                  </Panel>
                );
              })}
            </>
          ) : null}

          <View
            style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <AppText style={{ fontFamily: fonts.black, fontSize: 26, lineHeight: 30 }}>
              Completed
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              {unlocked.length} unlocked
            </AppText>
          </View>
          <Panel padded={false}>
            {unlocked.length === 0 ? (
              <View style={{ padding: space.lg }}>
                <AppText variant="footnote" tone="tertiary">
                  Your first completed milestone will live here.
                </AppText>
              </View>
            ) : (
              unlocked.map((achievement, index) => (
                <View
                  key={achievement.title}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    padding: space.lg,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.separator,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.pill,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="check" size={21} color={colors.onPrimary} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText style={{ fontFamily: fonts.bold, fontSize: 17, lineHeight: 21 }}>
                      {achievement.title}
                    </AppText>
                    <AppText variant="footnote" tone="tertiary">
                      {achievement.body}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="primary">
                    DONE
                  </AppText>
                </View>
              ))
            )}
          </Panel>
        </>
      ) : null}
    </Screen>
  );
}
