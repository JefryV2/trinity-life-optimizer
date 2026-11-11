import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

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
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useEnvironment } from '@/features/dashboard/use-environment';
import { useHealth } from '@/features/health/use-health';
import { formatLongDate, formatNumber, greeting, scoreLabel } from '@/lib/format';
import { aqiColor, pm25Color, uvColor, uvLabel } from '@/lib/health-colors';
import { openAdd, openHealth, openInsight, openRelations, openWealth } from '@/lib/navigation';
import { ACTION_HINT, PILLAR_ROUTE } from '@/lib/score-labels';
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
          <Reveal index={0}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <TrinityRings
              size={220}
              rings={[
                { key: 'health', label: 'Health', value: data.health.score, color: colors.primary },
                { key: 'wealth', label: 'Wealth', value: data.wealth.score, color: colors.amber },
                { key: 'relations', label: 'Bonds', value: data.relations.score, color: colors.success },
              ]}
              center={Math.round(data.trinity)}
              centerLabel="TRINITY"
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
                    caption: `${Math.round(data.wealth.rate)}% saved`,
                    value: data.wealth.score,
                    open: () => openWealth(),
                  },
                  {
                    key: 'relations' as const,
                    label: 'Bonds',
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
                    style={{ fontSize: 30, lineHeight: 34, color: pillarColor[pillar.key] }}
                  >
                    {Math.round(pillar.value)}
                  </AppText>
                  <AppText variant="caption" tone="tertiary">
                    {pillar.caption}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
          </Reveal>

          {data.score?.topAction ? (
            <View style={{ gap: space.sm }}>
              <SectionHeader index="01" title="One thing" />
              <Nudge
                title={data.score.topAction.label}
                body={ACTION_HINT[data.score.topAction.key] ?? 'Log this and the reading gets sharper.'}
                actionLabel={`${data.score.topAction.points} points available`}
                onPress={() => router.push(PILLAR_ROUTE[data.score.topAction!.pillar] as never)}
              />
            </View>
          ) : null}

          <Reveal index={1}>
          <View style={{ gap: space.md }}>
            <SectionHeader index="02" title="Today's vitals" caption="From your latest records" />
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
            <SectionHeader index="03" title="Stress" caption="What is loading you today" />
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
                <AppText variant="footnote" tone="secondary">
                  {data.stress.drivers[0]
                    ? `${data.stress.drivers[0].label} is the main driver.`
                    : 'Nothing is loading you right now.'}
                </AppText>
                {data.stress.drivers.slice(1).map((driver) => (
                  <AppText key={driver.key} variant="caption" tone="tertiary">
                    {driver.label}
                  </AppText>
                ))}
              </View>
            </View>
          </View>
          </Reveal>

          {environment.data ? (
            <Reveal index={3}>
            <View style={{ gap: space.md }}>
              <SectionHeader index="03" title="Around you" caption="UV and air quality near your location" />
              <Card>
                <StatRow>
                  <Stat
                    value={environment.data.uv !== null ? environment.data.uv.toFixed(1) : '—'}
                    label={`UV · ${uvLabel(environment.data.uv)}`}
                    color={uvColor(environment.data.uv)}
                  />
                  <Stat
                    value={environment.data.aqi !== null ? String(environment.data.aqi) : '—'}
                    label={`Air · ${environment.data.label}`}
                    color={aqiColor(environment.data.aqi)}
                  />
                  <Stat
                    value={environment.data.pm25 !== null ? environment.data.pm25.toFixed(1) : '—'}
                    label="PM2.5 µg/m³"
                    color={pm25Color(environment.data.pm25)}
                  />
                </StatRow>
              </Card>
            </View>
            </Reveal>
          ) : null}

          <Reveal index={4}>
          <View style={{ gap: space.md }}>
            <SectionHeader index="05" title="Quick log" caption="One tap, real records" />
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
          </Reveal>

          <Reveal index={5}>
          <View style={{ gap: space.md }}>
            <SectionHeader index="06" title="Reading" />
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/why' as never)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.md,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="callout">
                    {data.score && data.score.total > 0
                      ? `Why is it ${data.score.total}?`
                      : 'How the score works'}
                  </AppText>
                  <AppText variant="footnote" tone="tertiary">
                    Every point traced to something you logged
                  </AppText>
                </View>
                <Icon name="chevron" size={16} color={colors.textTertiary} />
              </Pressable>
              <View style={{ height: 1, backgroundColor: colors.separator }} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/experiments' as never)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.md,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="callout">Run a 7-day experiment</AppText>
                  <AppText variant="footnote" tone="tertiary">
                    Hold one rule, then see what it actually changed
                  </AppText>
                </View>
                <Icon name="chevron" size={16} color={colors.textTertiary} />
              </Pressable>
            </Card>
          </View>
          </Reveal>

          {data.insights.length > 0 ? (
            <Reveal index={6}>
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
            </Reveal>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}