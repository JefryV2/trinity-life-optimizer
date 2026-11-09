import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { ScoreRing } from '@/components/charts/score-ring';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useEnvironment } from '@/features/dashboard/use-environment';
import { useHealth } from '@/features/health/use-health';
import { formatLongDate, formatNumber, greeting, scoreLabel } from '@/lib/format';
import { openAdd, openHealth, openInsight, openRelations, openWealth } from '@/lib/navigation';
import { radius, space, useTheme } from '@/theme';

const PILLAR_ICON: Record<string, IconName> = {
  health: 'heart',
  wealth: 'wallet',
  relations: 'people',
};

export default function Dashboard() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching } = useDashboard();
  const { addWater } = useHealth();
  const environment = useEnvironment();

  const pillarColor = {
    health: colors.primary,
    wealth: colors.amber,
    relations: colors.success,
  };

  const drinkWater = useCallback(() => {
    addWater.mutate(250, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  }, [addWater]);

  return (
    <Screen
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
      <View style={{ gap: 2 }}>
        <AppText variant="title">
          {greeting()}, {data?.name ?? 'there'}
        </AppText>
        <AppText variant="footnote" tone="secondary">
          {formatLongDate()}
        </AppText>
      </View>

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data ? (
        <>
          <Card raised style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
            <ScoreRing score={data.trinity} size={116} stroke={10} label="Trinity" />
            <View style={{ flex: 1, gap: space.md }}>
              <View style={{ gap: 2 }}>
                <AppText variant="headline">{scoreLabel(data.trinity)}</AppText>
                <AppText variant="footnote" tone="secondary">
                  The average of your three pillars today.
                </AppText>
              </View>
              {(['health', 'wealth', 'relations'] as const).map((pillar) => (
                <View
                  key={pillar}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: pillarColor[pillar],
                    }}
                  />
                  <AppText variant="footnote" tone="secondary" style={{ flex: 1 }}>
                    {pillar[0].toUpperCase() + pillar.slice(1)}
                  </AppText>
                  <AppText variant="footnote" style={{ fontVariant: ['tabular-nums'] }}>
                    {Math.round(data[pillar].score)}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>

          <View style={{ gap: space.md }}>
            <SectionHeader title="Today's vitals" caption="From your latest records" />
            <Card style={{ gap: space.lg }}>
              <StatRow>
                <Stat value={formatNumber(data.health.steps)} label="Steps" />
                <Stat
                  value={data.health.sleepHours > 0 ? data.health.sleepHours.toFixed(1) : '—'}
                  label="Sleep avg (h)"
                />
              </StatRow>
              <StatRow>
                <Stat
                  value={formatNumber(data.health.water)}
                  label="Water (ml)"
                  tone={data.health.water >= data.health.waterTarget ? 'success' : 'default'}
                />
                <Stat
                  value={data.health.stress > 0 ? data.health.stress.toFixed(1) : '—'}
                  label="Stress /10"
                  tone={data.health.stress >= 7 ? 'danger' : 'default'}
                />
              </StatRow>
            </Card>
          </View>

          {environment.data ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Around you" caption="UV and air quality near your location" />
              <Card>
                <StatRow>
                  <Stat
                    value={environment.data.uv !== null ? environment.data.uv.toFixed(1) : '—'}
                    label="UV index"
                    tone={environment.data.uv !== null && environment.data.uv >= 8 ? 'danger' : 'default'}
                  />
                  <Stat
                    value={environment.data.aqi !== null ? String(environment.data.aqi) : '—'}
                    label={`Air · ${environment.data.label}`}
                    tone={environment.data.aqi !== null && environment.data.aqi >= 4 ? 'danger' : 'default'}
                  />
                  <Stat
                    value={environment.data.pm25 !== null ? environment.data.pm25.toFixed(1) : '—'}
                    label="PM2.5 µg/m³"
                  />
                </StatRow>
              </Card>
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <SectionHeader title="Quick log" caption="One tap, real records" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <Button
                label="+250 ml water"
                variant="soft"
                size="small"
                icon={<Icon name="water" size={15} color={colors.primary} />}
                loading={addWater.isPending}
                onPress={drinkWater}
              />
              <Button label="Sleep" variant="secondary" size="small" onPress={() => openAdd('sleep')} />
              <Button
                label="Expense"
                variant="secondary"
                size="small"
                onPress={() => openAdd('transaction')}
              />
              <Button label="Mood" variant="secondary" size="small" onPress={() => openAdd('mental')} />
            </View>
          </View>

          <View style={{ gap: space.md }}>
            <SectionHeader title="The three pillars" />
            {(
              [
                {
                  key: 'health' as const,
                  title: 'Health',
                  caption: `${data.health.exerciseMinutes} min moved · ${formatNumber(data.health.calories)} kcal eaten`,
                  score: data.health.score,
                  open: () => openHealth(),
                },
                {
                  key: 'wealth' as const,
                  title: 'Wealth',
                  caption: `Savings rate ${Math.round(data.wealth.rate)}% this month`,
                  score: data.wealth.score,
                  open: () => openWealth(),
                },
                {
                  key: 'relations' as const,
                  title: 'Relations',
                  caption: `${data.relations.people} people · ${data.relations.interactions} contacts this week`,
                  score: data.relations.score,
                  open: openRelations,
                },
              ]
            ).map((pillar) => (
              <Pressable
                key={pillar.key}
                accessibilityRole="button"
                onPress={pillar.open}
                style={({ pressed }) => ({
                  borderRadius: radius.card,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Card style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: radius.small,
                        backgroundColor: colors.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={PILLAR_ICON[pillar.key]} size={18} color={pillarColor[pillar.key]} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="callout" style={{ fontWeight: '600' }}>
                        {pillar.title}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {pillar.caption}
                      </AppText>
                    </View>
                    <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                      {Math.round(pillar.score)}
                    </AppText>
                    <Icon name="chevron" size={14} color={colors.textTertiary} />
                  </View>
                  <Progress value={pillar.score} color={pillarColor[pillar.key]} />
                </Card>
              </Pressable>
            ))}
          </View>

          {data.insights.length > 0 ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Coach notes" caption="Based on what you actually logged" />
              {data.insights.map((insight) => (
                <Pressable
                  key={insight.title}
                  accessibilityRole="button"
                  onPress={() => openInsight(insight.href)}
                  style={({ pressed }) => ({
                    borderRadius: radius.card,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Card style={{ gap: space.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Icon
                        name={PILLAR_ICON[insight.pillar]}
                        size={15}
                        color={pillarColor[insight.pillar]}
                      />
                      <AppText variant="callout" style={{ flex: 1, fontWeight: '600' }}>
                        {insight.title}
                      </AppText>
                      <Icon name="chevron" size={14} color={colors.textTertiary} />
                    </View>
                    <AppText variant="footnote" tone="secondary">
                      {insight.body}
                    </AppText>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}