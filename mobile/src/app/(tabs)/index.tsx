import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { TrinityRings } from '@/components/charts/trinity-rings';
import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Nudge } from '@/components/ui/pillar-strip';
import { Screen } from '@/components/ui/screen';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { FirstSignal } from '@/features/dashboard/first-signal';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useHealth } from '@/features/health/use-health';
import { formatLongDate, formatNumber, greeting, scoreLabel } from '@/lib/format';
import { trackOnce } from '@/lib/analytics';
import { openAdd, openHealth, openInsight, openRelations, openWealth } from '@/lib/navigation';
import { ACTION_HINT, ACTION_LABEL, PILLAR_COLOR, PILLAR_ROUTE } from '@/lib/score-labels';
import { radius, space, useTheme } from '@/theme';

const PILLAR_ICON: Record<string, IconName> = {
  health: 'heart',
  wealth: 'wallet',
  relations: 'people',
};

export default function Dashboard() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching, isStale } = useDashboard();
  const { addWater } = useHealth({ fetch: false });

  const pillarColor = {
    health: PILLAR_COLOR.health,
    wealth: PILLAR_COLOR.wealth,
    relations: PILLAR_COLOR.bonds,
  };

  const firstSignal = data
    ? data.focus === 'health'
      ? data.health.steps === 0 && data.health.sleepHours === 0 && data.health.water === 0
      : data.focus === 'wealth'
        ? data.wealth.income === 0 && data.wealth.expenses === 0
        : data.relations.interactions === 0
    : false;

  const [justLogged, setJustLogged] = useState(false);
  const loggedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data && !firstSignal) {
      void trackOnce('first_signal_logged', { focus: data.focus });
    }
  }, [data, firstSignal]);

  useEffect(
    () => () => {
      if (loggedTimer.current) clearTimeout(loggedTimer.current);
    },
    [],
  );

  // Other tabs mark the dashboard stale instead of refetching 14 tables in the
  // save path. Catch up when Today becomes visible again.
  useFocusEffect(
    useCallback(() => {
      if (data && isStale) void refetch();
    }, [data, isStale, refetch]),
  );

  const drinkWater = useCallback(() => {
    addWater.mutate(250, {
      onSuccess: () => {
        setJustLogged(true);
        if (loggedTimer.current) clearTimeout(loggedTimer.current);
        loggedTimer.current = setTimeout(() => setJustLogged(false), 1600);
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
          {firstSignal ? <FirstSignal focus={data.focus} people={data.relations.people} /> : null}

          <Reveal index={0}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <TrinityRings
              size={220}
              rings={[
                { key: 'health', label: 'Health', value: data.health.score, color: colors.primary },
                { key: 'wealth', label: 'Wealth', value: data.wealth.score, color: data.wealth.tracked ? colors.amber : colors.textFaint },
                { key: 'relations', label: 'People', value: data.relations.score, color: PILLAR_COLOR.bonds },
              ]}
              center={Math.round(data.trinity)}
              centerLabel="AUXO"
            />

            <AppText variant="headline" tone="secondary">
              {scoreLabel(data.trinity)}
            </AppText>

            <View style={{ flexDirection: 'row', gap: space.lg, width: '100%' }}>
              {(
                [
                  {
                    key: 'health' as const,
                    label: 'Health',
                    caption: `${formatNumber(data.health.steps)} steps`,
                    value: data.health.score,
                    open: () => openHealth(),
                  },
                  {
                    key: 'wealth' as const,
                    label: 'Wealth',
                    caption: data.wealth.tracked ? `${Math.round(data.wealth.rate)}% saved` : 'No income logged',
                    value: data.wealth.score,
                    open: () => openWealth(),
                  },
                  {
                    key: 'relations' as const,
                    label: 'People',
                    caption: `${data.relations.people} people`,
                    value: data.relations.score,
                    open: openRelations,
                  },
                ]
              ).map((pillar) => (
                <Pressable
                  key={pillar.key}
                  accessibilityRole="button"
                  onPress={pillar.open}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: 'center',
                    gap: 2,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: pillarColor[pillar.key],
                      }}
                    />
                    <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.4 }}>
                      {pillar.label.toUpperCase()}
                    </AppText>
                  </View>
                  <AppText
                    variant="headline"
                    style={{
                      fontSize: 30,
                      lineHeight: 34,
                      fontVariant: ['tabular-nums'],
                      color: pillarColor[pillar.key],
                    }}
                  >
                    {pillar.key === 'wealth' && !data.wealth.tracked ? '—' : Math.round(pillar.value)}
                  </AppText>
                  <AppText variant="caption" tone="tertiary">
                    {pillar.caption}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <AppText
                variant="footnote"
                tone="primary"
                onPress={() => router.push('/why' as never)}
                style={{ paddingVertical: 4 }}
              >
                {data.score.total > 0 ? `Why ${data.score.total}?` : 'How the score works'}
              </AppText>
              <AppText
                variant="footnote"
                tone="tertiary"
                onPress={() => router.push('/experiments' as never)}
                style={{ paddingVertical: 4 }}
              >
                Run a 7-day experiment
              </AppText>
            </View>
          </View>
          </Reveal>

          {data.score?.topAction && !firstSignal ? (
            <View style={{ gap: space.sm }}>
              <SectionHeader index="01" title="One thing" />
              <Nudge
                title={data.score.topAction.label}
                body={ACTION_HINT[data.score.topAction.key] ?? 'Log this and the reading gets sharper.'}
                actionLabel={ACTION_LABEL[data.score.topAction.key] ?? 'Open'}
                onPress={() => {
                  const action = data.score.topAction!;
                  switch (action.key) {
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
                    case 'spend':
                      openAdd('transaction');
                      break;
                    case 'contact':
                      if (data.relations.people === 0) openAdd('person');
                      else openAdd('interaction');
                      break;
                    default:
                      router.push(PILLAR_ROUTE[action.pillar] as never);
                  }
                }}
              />
            </View>
          ) : null}

          <Reveal index={1}>
          <View style={{ gap: space.md }}>
            <SectionHeader index="02" title="Today's vitals" />
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
          </Reveal>

          <Reveal index={2}>
          <View style={{ gap: space.md }}>
            <SectionHeader index="03" title="Stress" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
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
              <View style={{ flex: 1, gap: 4 }}>
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
          </Reveal>

          <Reveal index={3}>
          <View style={{ gap: space.md }}>
            <SectionHeader index="04" title="Quick log" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <Button
                label="+250 ml water"
                variant="soft"
                size="small"
                icon={
                  justLogged ? (
                    <Animated.View key="logged" entering={FadeIn.duration(160)}>
                      <Icon name="check" size={15} color={colors.primary} />
                    </Animated.View>
                  ) : (
                    <Icon name="water" size={15} color={colors.primary} />
                  )
                }
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
              <Button label="Food" variant="secondary" size="small" onPress={() => router.push('/meal-builder' as never)} />
              <Button label="Mood" variant="secondary" size="small" onPress={() => openAdd('mental')} />
            </View>
          </View>
          </Reveal>

          {data.insights.length > 0 ? (
            <Reveal index={4}>
            <View style={{ gap: space.md }}>
              <SectionHeader title="Coach notes" />
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
            </Reveal>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}