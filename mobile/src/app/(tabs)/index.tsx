import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { TrinityRings } from '@/components/charts/trinity-rings';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Nudge } from '@/components/ui/pillar-strip';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Stat, StatRow } from '@/components/ui/stat';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { FirstSignal } from '@/features/dashboard/first-signal';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { formatNumber, formatStamp, greeting, scoreLabel } from '@/lib/format';
import { trackOnce } from '@/lib/analytics';
import { openAdd, openHealth, openInsight, openRelations, openWealth } from '@/lib/navigation';
import { ACTION_HINT, ACTION_LABEL, PILLAR_COLOR, PILLAR_ROUTE } from '@/lib/score-labels';
import { space, useTheme } from '@/theme';

const PILLAR_ICON: Record<string, IconName> = {
  health: 'heart',
  wealth: 'wallet',
  relations: 'people',
};

export default function Dashboard() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching, isStale } = useDashboard();

  const firstSignal = data
    ? data.focus === 'health'
      ? data.health.steps === 0 && data.health.sleepHours === 0 && data.health.water === 0
      : data.focus === 'wealth'
        ? data.wealth.income === 0 && data.wealth.expenses === 0
        : data.relations.interactions === 0
    : false;

  useEffect(() => {
    if (data && !firstSignal) {
      void trackOnce('first_signal_logged', { focus: data.focus });
    }
  }, [data, firstSignal]);

  // Other tabs mark the dashboard stale instead of refetching 14 tables in the
  // save path. Catch up when Today becomes visible again.
  useFocusEffect(
    useCallback(() => {
      if (data && isStale) void refetch();
    }, [data, isStale, refetch]),
  );

  const hour = new Date().getHours();
  const late = hour >= 22 || hour < 5;
  const healthPillar = data?.score.pillars.find((pillar) => pillar.key === 'health');
  const sleep = healthPillar?.contributions.find((item) => item.key === 'sleep');
  const nightAction = late && sleep && sleep.lost > 0 ? sleep : null;
  const topAction = data?.score.topAction ?? null;
  const latePlan = Boolean(
    late && !nightAction && topAction && ['steps', 'exercise'].includes(topAction.key),
  );

  const openTopAction = () => {
    if (!topAction) return;
    switch (topAction.key) {
      case 'sleep':
        openAdd('sleep');
        break;
      case 'steps':
      case 'water':
        openHealth('fitness');
        break;
      case 'exercise':
        openAdd('exercise');
        break;
      case 'mental':
      case 'mood':
        openAdd('mental');
        break;
      case 'savings':
        openWealth('overview');
        break;
      case 'spend':
        openWealth('expenses');
        break;
      case 'contact':
        if (data?.relations.people === 0) openAdd('person');
        else openAdd('interaction');
        break;
      default:
        router.push(PILLAR_ROUTE[topAction.pillar] as never);
    }
  };

  const pillars = data
    ? [
        {
          key: 'health' as const,
          label: 'Health',
          value: data.health.score,
          color: PILLAR_COLOR.health,
          caption:
            data.health.steps > 0
              ? `${formatNumber(data.health.steps)} steps`
              : data.health.sleepHours > 0
                ? `${data.health.sleepHours.toFixed(1)} h sleep`
                : 'Not logged',
          open: () => openHealth(),
        },
        {
          key: 'wealth' as const,
          label: 'Wealth',
          value: data.wealth.tracked ? data.wealth.score : null,
          color: data.wealth.tracked ? PILLAR_COLOR.wealth : colors.textTertiary,
          caption: data.wealth.tracked ? `${Math.round(data.wealth.rate)}% saved` : 'No income logged',
          open: () => openWealth(),
        },
        {
          key: 'relations' as const,
          label: 'People',
          value: data.relations.score,
          color: PILLAR_COLOR.bonds,
          caption: `${data.relations.people} ${data.relations.people === 1 ? 'person' : 'people'}`,
          open: openRelations,
        },
      ]
    : [];

  return (
    <Screen
      header={
        <View style={{ gap: 2 }}>
          <AppText variant="title" numberOfLines={1}>
            {greeting()}
          </AppText>
          <AppText variant="mono" tone="tertiary">
            {data?.name ? `${data.name} · ${formatStamp()}` : formatStamp()}
          </AppText>
        </View>
      }
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
      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data ? (
        <>
          {firstSignal ? <FirstSignal focus={data.focus} people={data.relations.people} /> : null}

          <View style={{ alignItems: 'center', gap: space.sm }}>
            <TrinityRings
              size={180}
              stroke={11}
              gap={6}
              centerSize={48}
              rings={[
                { key: 'health', label: 'Health', value: data.health.score, color: colors.primary },
                {
                  key: 'wealth',
                  label: 'Wealth',
                  value: data.wealth.score,
                  color: data.wealth.tracked ? colors.amber : colors.textFaint,
                },
                { key: 'relations', label: 'People', value: data.relations.score, color: PILLAR_COLOR.bonds },
              ]}
              center={Math.round(data.trinity)}
              centerLabel="AUXO"
            />

            <AppText variant="headline" tone="secondary">
              {scoreLabel(data.trinity)}
            </AppText>
          </View>

          <View>
            {pillars.map((pillar, index) => (
              <Pressable
                key={pillar.key}
                accessibilityRole="button"
                accessibilityHint={`Opens ${pillar.label}`}
                onPress={pillar.open}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.md,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.separator,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: pillar.color,
                  }}
                />
                <View style={{ flex: 1, gap: 1 }}>
                  <AppText variant="callout">{pillar.label}</AppText>
                  <AppText variant="footnote" tone="tertiary">
                    {pillar.caption}
                  </AppText>
                </View>
                <AppText
                  variant="headline"
                  style={{ color: pillar.color, fontVariant: ['tabular-nums'] }}
                >
                  {pillar.value === null ? '—' : Math.round(pillar.value)}
                </AppText>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/why' as never)}
            hitSlop={12}
            style={({ pressed }) => ({
              alignSelf: 'center',
              minHeight: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <AppText variant="footnote" tone="primary">
              {data.score.total > 0 ? `Why ${data.score.total}?` : 'How the score works'}
            </AppText>
          </Pressable>

          {!firstSignal ? (
            <View style={{ gap: space.sm }}>
              <SectionHeader title="Next step" />
              <Nudge
                title={
                  nightAction
                    ? ACTION_HINT.sleep
                    : latePlan
                      ? 'Plan tomorrow'
                      : topAction
                        ? ACTION_HINT[topAction.key] ?? topAction.label
                        : 'Log one thing'
                }
                body={
                  nightAction
                    ? `${nightAction.display} · ${nightAction.lost} points left`
                    : latePlan
                      ? 'Steps and workouts are better in daylight. Pick one thing for tomorrow.'
                      : topAction
                        ? `${topAction.display} · ${topAction.points} points available`
                        : 'One entry is enough to make today readable.'
                }
                actionLabel={
                  nightAction
                    ? 'Log sleep'
                    : latePlan
                      ? 'Choose a next step'
                      : topAction
                        ? ACTION_LABEL[topAction.key] ?? 'Open'
                        : 'Log'
                }
                onPress={
                  nightAction
                    ? () => openAdd('sleep')
                    : latePlan
                      ? () => router.push('/experiments' as never)
                      : openTopAction
                }
              />
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <SectionHeader title="Today's vitals" />
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
          </View>

          <View style={{ gap: space.md }}>
            <SectionHeader title="Stress load" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
              <RingMeter
                value={data.stress.score}
                max={100}
                size={88}
                stroke={7}
                color={
                  data.stress.level === 'High'
                    ? colors.danger
                    : data.stress.level === 'Medium'
                      ? colors.amber
                      : colors.primary
                }
                center={String(data.stress.score)}
                label="Load"
              />
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="headline">{data.stress.level}</AppText>
                {data.stress.drivers.length > 0 ? (
                  data.stress.drivers.map((driver) => (
                    <AppText key={driver.key} variant="footnote" tone="secondary">
                      {driver.label}
                    </AppText>
                  ))
                ) : (
                  <AppText variant="footnote" tone="secondary">
                    All clear.
                  </AppText>
                )}
              </View>
            </View>
          </View>

          {data.insights.length > 0 ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Coach notes" />
              {data.insights.map((insight) => (
                <Pressable
                  key={insight.title}
                  accessibilityRole="button"
                  onPress={() => openInsight(insight.href)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Card style={{ gap: space.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Icon
                        name={PILLAR_ICON[insight.pillar]}
                        size={15}
                        color={PILLAR_COLOR[insight.pillar]}
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
