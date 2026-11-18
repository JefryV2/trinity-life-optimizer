import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { RingMeter } from '@/components/charts/ring-meter';
import { TrinityRings } from '@/components/charts/trinity-rings';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { FirstSignal } from '@/features/dashboard/first-signal';
import { RouteThumb } from '@/features/health/components/route-thumb';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { formatNumber, formatStamp, greeting, scoreLabel } from '@/lib/format';
import { trackOnce } from '@/lib/analytics';
import { openAdd, openHealth, openRelations, openWealth } from '@/lib/navigation';
import { ACTION_HINT, ACTION_LABEL, PILLAR_COLOR, PILLAR_ROUTE } from '@/lib/score-labels';
import { radius, space, useTheme } from '@/theme';

const Surface = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.group,
          padding: space.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/** A quiet route motif used when a saved GPS shape is not available. */
const RouteSketch = () => {
  const { colors } = useTheme();
  return (
    <Svg width="100%" height={82} viewBox="0 0 160 82">
      {[0.25, 0.5, 0.75].map((ratio) => (
        <Line
          key={`h-${ratio}`}
          x1={0}
          y1={10 + 62 * ratio}
          x2={160}
          y2={10 + 62 * ratio}
          stroke={colors.separator}
          strokeWidth={1}
        />
      ))}
      {[0.25, 0.5, 0.75].map((ratio) => (
        <Line
          key={`v-${ratio}`}
          x1={16 + 128 * ratio}
          y1={10}
          x2={16 + 128 * ratio}
          y2={72}
          stroke={colors.separator}
          strokeWidth={1}
        />
      ))}
      <Path
        d="M14 66 C 28 54, 32 34, 48 38 S 66 64, 82 50 S 104 18, 122 26 S 142 48, 150 38"
        stroke={colors.primary}
        strokeWidth={2}
        strokeDasharray="1 5"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={14} cy={66} r={3} fill={colors.background} stroke={colors.primary} strokeWidth={1.6} />
      <Circle cx={150} cy={38} r={3.4} fill={colors.primary} stroke={colors.background} strokeWidth={1.2} />
    </Svg>
  );
};

export default function Dashboard() {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
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

  useFocusEffect(
    useCallback(() => {
      if (data && isStale) void refetch();
    }, [data, isStale, refetch]),
  );

  const topAction = data?.score.topAction ?? null;
  const actionPillar = data?.score.pillars.find((pillar) => pillar.key === topAction?.pillar);
  const currentPoints = Math.round(actionPillar?.value ?? 0);
  const targetPoints = Math.min(100, currentPoints + (topAction?.points ?? 0));

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
          open: () => openHealth(),
        },
        {
          key: 'wealth' as const,
          label: 'Wealth',
          value: data.wealth.tracked ? data.wealth.score : null,
          color: data.wealth.tracked ? PILLAR_COLOR.wealth : colors.textTertiary,
          open: () => openWealth(),
        },
        {
          key: 'relations' as const,
          label: 'People',
          value: data.relations.score,
          color: PILLAR_COLOR.bonds,
          open: openRelations,
        },
      ]
    : [];

  const weakest = data?.score.pillars.find((pillar) => pillar.key === data.score.weakest);
  const ringSize = Math.min(300, Math.round(width * 0.78));
  const stressColor =
    data?.stress.level === 'High'
      ? colors.danger
      : data?.stress.level === 'Medium'
        ? colors.amber
        : colors.primary;

  return (
    <Screen
      header={
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <AppText
              variant="title"
              numberOfLines={1}
              style={[
                { flex: 1 },
                fontScale > 1.15 ? { fontSize: 27, lineHeight: 32 } : null,
              ]}
            >
              {greeting()}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile and settings"
              onPress={() => router.push('/more' as never)}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <Icon name="user" size={17} color={colors.textSecondary} />
            </Pressable>
          </View>
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

          <View
            style={{
              height: 282,
              marginTop: -space.sm,
              overflow: 'hidden',
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: -Math.round(ringSize * 0.42),
                top: -18,
              }}
            >
              <TrinityRings
                size={ringSize}
                stroke={16}
                gap={9}
                center=""
                rings={[
                  { key: 'health', label: 'Health', value: data.health.score, color: colors.primary },
                  {
                    key: 'wealth',
                    label: 'Wealth',
                    value: data.wealth.score,
                    color: data.wealth.tracked ? colors.amber : colors.textFaint,
                  },
                  {
                    key: 'relations',
                    label: 'People',
                    value: data.relations.score,
                    color: PILLAR_COLOR.bonds,
                  },
                ]}
              />
            </View>

            <View style={{ width: 218, gap: space.xs, paddingTop: space.lg }}>
              <AppText
                variant="display"
                selectable
                style={{ fontSize: 68, lineHeight: 72, letterSpacing: -3 }}
              >
                {Math.round(data.trinity)}
              </AppText>
              <AppText variant="headline" style={{ color: colors.primary }}>
                {scoreLabel(data.trinity)}
              </AppText>
              {weakest ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 4, rowGap: 0 }}>
                  <AppText
                    variant="callout"
                    style={{ color: PILLAR_COLOR[weakest.key] }}
                  >
                    {weakest.label}
                  </AppText>
                  <AppText variant="callout" tone="secondary">
                    is holding you back
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              columnGap: space.lg,
              rowGap: space.xs,
            }}
          >
            {pillars.map((pillar) => (
              <Pressable
                key={pillar.key}
                accessibilityRole="button"
                accessibilityHint={`Opens ${pillar.label}`}
                onPress={pillar.open}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 4,
                  minHeight: 44,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <AppText
                  variant="headline"
                  style={{
                    fontSize: 28,
                    lineHeight: 32,
                    fontVariant: ['tabular-nums'],
                    color: pillar.color,
                  }}
                >
                  {pillar.value === null ? '—' : Math.round(pillar.value)}
                </AppText>
                <AppText variant="callout">
                  {pillar.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/why' as never)}
            hitSlop={12}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              minHeight: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <AppText variant="callout" tone="primary" style={{ fontWeight: '600' }}>
              {`Why ${Math.round(data.trinity)}?  →`}
            </AppText>
          </Pressable>

          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.group,
              padding: space.xl,
              gap: space.md,
            }}
          >
            <AppText
              variant="caption"
              style={{ color: colors.onPrimary, letterSpacing: 0.8, fontWeight: '700' }}
            >
              {`NEXT STEP${topAction ? ` · +${topAction.points} PTS` : ''}`}
            </AppText>
            <AppText
              variant="headline"
              style={{ color: colors.onPrimary, fontSize: 24, lineHeight: 28 }}
            >
              {topAction ? ACTION_HINT[topAction.key] ?? topAction.label : 'Log one thing'}
            </AppText>
            {topAction ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: space.md,
                  }}
                >
                  <AppText variant="footnote" style={{ color: colors.onPrimary }}>
                    {`${actionPillar?.label ?? 'Score'} now ${currentPoints}`}
                  </AppText>
                  <AppText variant="footnote" style={{ color: colors.onPrimary }}>
                    {`could reach ${targetPoints}`}
                  </AppText>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    overflow: 'hidden',
                    flexDirection: 'row',
                    backgroundColor: 'rgba(7,7,8,0.16)',
                  }}
                >
                  <View
                    style={{
                      width: `${currentPoints}%`,
                      backgroundColor: colors.onPrimary,
                    }}
                  />
                  <View
                    style={{
                      width: `${Math.max(0, targetPoints - currentPoints)}%`,
                      backgroundColor: 'rgba(7,7,8,0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    <Svg width="100%" height="100%">
                      <Defs>
                        <Pattern
                          id="next-hatch"
                          width={6}
                          height={6}
                          patternUnits="userSpaceOnUse"
                          patternTransform="rotate(45)"
                        >
                          <Line x1={0} y1={0} x2={0} y2={6} stroke="rgba(7,7,8,0.5)" strokeWidth={2} />
                        </Pattern>
                      </Defs>
                      <Rect width="100%" height="100%" fill="url(#next-hatch)" />
                    </Svg>
                  </View>
                </View>
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={topAction ? ACTION_LABEL[topAction.key] ?? 'Open next step' : 'Log one thing'}
              onPress={openTopAction}
              style={({ pressed }) => ({
                minHeight: 52,
                borderRadius: 999,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText variant="callout" tone="primary" style={{ fontWeight: '700' }}>
                {topAction ? ACTION_LABEL[topAction.key] ?? 'Open' : 'Log one thing'}
              </AppText>
              <AppText variant="callout" tone="primary">
                →
              </AppText>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Surface style={{ flex: 1, minHeight: 208, gap: space.sm }}>
              <AppText
                variant="caption"
                tone="tertiary"
                style={{ letterSpacing: 0.7, fontWeight: '600' }}
              >
                LAST WALK
              </AppText>
              <View style={{ height: 82, marginVertical: space.xs }}>
                {data.lastWalkRoute ? (
                  <RouteThumb
                    segments={data.lastWalkRoute}
                    width={Math.max(100, Math.round(width / 2 - 56))}
                    height={82}
                  />
                ) : (
                  <RouteSketch />
                )}
              </View>
              <View style={{ marginTop: 'auto', gap: 1 }}>
                <AppText
                  variant="numeric"
                  selectable
                  style={{ fontSize: 32, lineHeight: 36 }}
                >
                  {formatNumber(data.health.steps)}
                </AppText>
                <AppText variant="footnote" tone="secondary">
                  Steps
                </AppText>
              </View>
            </Surface>

            <View style={{ flex: 1, gap: space.md }}>
              <Surface style={{ minHeight: 98, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm }}>
                  <View style={{ gap: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <AppText variant="headline" style={{ fontSize: 30, lineHeight: 34 }}>
                        {data.health.sleepHours > 0 ? data.health.sleepHours.toFixed(1) : '—'}
                      </AppText>
                      <AppText variant="footnote" tone="tertiary">
                        h
                      </AppText>
                    </View>
                    <AppText variant="footnote" tone="secondary">
                      Sleep avg
                    </AppText>
                  </View>
                  <Icon name="moon" size={22} color={colors.bonds} />
                </View>
              </Surface>

              <Surface style={{ minHeight: 98, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm }}>
                  <View style={{ gap: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <AppText variant="headline" style={{ fontSize: 30, lineHeight: 34 }}>
                        {formatNumber(data.health.water)}
                      </AppText>
                      <AppText variant="footnote" tone="tertiary">
                        ml
                      </AppText>
                    </View>
                    <AppText variant="footnote" tone="secondary">
                      Water
                    </AppText>
                  </View>
                  <Icon name="water" size={22} color={colors.bonds} />
                </View>
              </Surface>
            </View>
          </View>

          <Surface>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
              <RingMeter
                value={data.stress.score}
                max={100}
                size={82}
                stroke={7}
                color={stressColor}
                center={String(data.stress.score)}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm }}>
                  <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.7, fontWeight: '600' }}>
                    STRESS LOAD
                  </AppText>
                  <AppText variant="callout" style={{ color: stressColor }}>
                    {data.stress.level}
                  </AppText>
                </View>
                <AppText variant="footnote" tone="secondary">
                  {`${data.health.stress.toFixed(1)} / 10 stress today`}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  {data.stress.drivers.length > 0
                    ? data.stress.drivers.map((driver) => driver.label).join(' · ')
                    : 'All clear.'}
                </AppText>
              </View>
            </View>
          </Surface>
        </>
      ) : null}
    </Screen>
  );
}
