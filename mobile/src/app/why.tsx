import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/detail-header';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { LoadingState } from '@/components/ui/states';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { formatStamp } from '@/lib/format';
import type { PillarKey } from '@/lib/score';
import { ACTION_HINT, PILLAR_COLOR, PILLAR_ROUTE } from '@/lib/score-labels';
import { radius, space, useTheme } from '@/theme';

const pillarLabel = (key: PillarKey) => {
  if (key === 'bonds') return 'People';
  return key === 'health' ? 'Health' : 'Wealth';
};

const routeFor = (key: PillarKey) => PILLAR_ROUTE[key] ?? '/(tabs)';

const Hatch = ({ color }: { color: string }) => (
  <Svg width="100%" height="100%">
    <Defs>
      <Pattern
        id="why-hatch"
        width={7}
        height={7}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <Line x1={0} y1={0} x2={0} y2={7} stroke={color} strokeOpacity={0.55} strokeWidth={2} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#why-hatch)" />
  </Svg>
);

const SegmentBar = ({
  ratio,
  color,
}: {
  ratio: number;
  color: string;
}) => {
  const { colors } = useTheme();
  const filled = Math.max(0, Math.min(1, ratio));

  return (
    <View
      style={{
        height: 24,
        borderRadius: radius.small,
        overflow: 'hidden',
        backgroundColor: colors.surfaceSunken,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${filled * 100}%`,
          backgroundColor: color,
        }}
      />
      {filled < 1 ? (
        <View style={{ position: 'absolute', left: `${filled * 100}%`, right: 0, top: 0, bottom: 0 }}>
          <Hatch color={color} />
        </View>
      ) : null}
    </View>
  );
};

export default function Why() {
  const { colors } = useTheme();
  const { data, isPending } = useDashboard();
  const [picked, setPicked] = useState<PillarKey | null>(null);

  const report = data?.score;
  const strongest = report?.pillars.find((pillar) => pillar.key === report.strongest);
  const weakest = report?.pillars.find((pillar) => pillar.key === report.weakest);
  const activeKey = picked ?? report?.weakest ?? 'health';
  const active = report?.pillars.find((pillar) => pillar.key === activeKey);
  const trackedInputs = active?.contributions.filter((item) => item.tracked) ?? [];
  const activeColor = PILLAR_COLOR[activeKey] ?? colors.primary;

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl, gap: space.lg }}>
      <View
        style={{
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.md,
        }}
      >
        <BackButton fallback="/(tabs)" />
        <AppText variant="mono" tone="tertiary">
          {formatStamp()}
        </AppText>
      </View>

      {isPending || !report || !active ? <LoadingState rows={4} /> : null}

      {report && active ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: space.lg,
            }}
          >
            <AppText
              variant="title"
              style={{ fontSize: 52, lineHeight: 54, letterSpacing: -2.4 }}
            >
              Why
            </AppText>
            <View style={{ alignItems: 'flex-end', gap: 1 }}>
              <AppText variant="caption" tone="tertiary">
                LIFE SCORE
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                <AppText
                  variant="display"
                  selectable
                  style={{ fontSize: 56, lineHeight: 56, letterSpacing: -3 }}
                >
                  {report.total}
                </AppText>
                <AppText
                  variant="footnote"
                  tone="tertiary"
                  style={{ paddingBottom: 7 }}
                >
                  /100
                </AppText>
              </View>
            </View>
          </View>

          <AppText variant="body" style={{ lineHeight: 22 }}>
            {report.total === 0 ? (
              'Nothing logged yet. One entry is enough to start the reading.'
            ) : (
              <>
                <AppText style={{ color: PILLAR_COLOR[report.strongest] }}>
                  {strongest?.label ?? ''}
                </AppText>
                {' is carrying you. '}
                <AppText style={{ color: PILLAR_COLOR[report.weakest] }}>
                  {weakest?.label ?? ''}
                </AppText>
                {' has the most room.'}
              </>
            )}
          </AppText>

          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              {report.pillars.map((pillar) => {
                const selected = pillar.key === activeKey;
                const color = PILLAR_COLOR[pillar.key] ?? colors.primary;
                return (
                  <Pressable
                    key={pillar.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${pillar.label}, ${Math.round(pillar.value)}`}
                    onPress={() => setPicked(pillar.key)}
                    style={({ pressed }) => ({
                      flex: 1,
                      gap: 2,
                      opacity: pressed ? 0.65 : 1,
                    })}
                  >
                    <AppText
                      variant="numeric"
                      style={{
                        fontSize: 30,
                        lineHeight: 34,
                        color,
                        opacity: selected ? 1 : 0.55,
                      }}
                    >
                      {Math.round(pillar.value)}
                    </AppText>
                    <AppText variant="caption" tone="tertiary">
                      {pillar.label}
                    </AppText>
                    <View
                      style={{
                        height: 3,
                        marginTop: 5,
                        borderRadius: 999,
                        backgroundColor: selected ? color : 'transparent',
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
            <View style={{ height: 1, backgroundColor: colors.separator }} />
          </View>

          <View style={{ gap: space.md }}>
            <AppText variant="caption" tone="tertiary">
              {`HOW ${active.label.toUpperCase()} ADDS UP · ${trackedInputs.length} ${
                trackedInputs.length === 1 ? 'INPUT' : 'INPUTS'
              }`}
            </AppText>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                columnGap: space.lg,
                rowGap: space.xl,
              }}
            >
              {active.contributions.map((item) => (
                <View key={item.key} style={{ width: '47%', gap: space.sm }}>
                  <SegmentBar ratio={item.ratio} color={activeColor} />
                  <View style={{ gap: 1 }}>
                    <AppText variant="callout" style={{ fontWeight: '700' }}>
                      {item.label}
                    </AppText>
                    <AppText variant="footnote" tone="tertiary">
                      {`${item.points} of ${item.max}`}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View>
            {active.contributions.map((item) => {
              const biggest =
                report.topAction?.pillar === active.key && report.topAction.key === item.key;
              return (
                <View
                  key={item.key}
                  style={{
                    gap: 4,
                    paddingVertical: space.lg,
                    borderTopWidth: 1,
                    borderTopColor: colors.separator,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                    }}
                  >
                    <AppText variant="headline" style={{ flexShrink: 1 }}>
                      {item.label}
                    </AppText>
                    {biggest ? (
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: activeColor,
                          borderRadius: radius.pill,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                        }}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: activeColor, letterSpacing: 0.7 }}
                        >
                          BIGGEST GAIN
                        </AppText>
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <AppText variant="numeric" style={{ fontSize: 28, lineHeight: 30 }}>
                      {item.points}
                      <AppText variant="footnote" tone="tertiary">
                        {` / ${item.max}`}
                      </AppText>
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: space.md,
                    }}
                  >
                    <AppText variant="footnote" tone="tertiary" style={{ flex: 1 }}>
                      {item.display}
                    </AppText>
                    <AppText
                      variant="footnote"
                      style={{ color: item.lost > 0 ? activeColor : colors.textTertiary }}
                    >
                      {item.lost > 0 ? `+${item.lost} pts left` : 'full'}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>

          {report.topAction ? (
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
                NEXT STEP
              </AppText>
              <AppText
                variant="headline"
                style={{ color: colors.onPrimary, fontSize: 26, lineHeight: 30 }}
              >
                {ACTION_HINT[report.topAction.key] ?? report.topAction.label}
              </AppText>
              <AppText variant="footnote" style={{ color: colors.onPrimary }}>
                {`${report.topAction.display} · ${report.topAction.points} points available`}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Go to ${pillarLabel(report.topAction.pillar)}`}
                onPress={() => router.push(routeFor(report.topAction!.pillar) as never)}
                style={({ pressed }) => ({
                  minHeight: 50,
                  borderRadius: radius.pill,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 7,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText variant="callout" tone="primary" style={{ fontWeight: '700' }}>
                  {`Go to ${pillarLabel(report.topAction.pillar)}`}
                </AppText>
                <AppText variant="callout" tone="primary">
                  →
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
            <Icon name="info" size={16} color={colors.textTertiary} />
            <AppText variant="footnote" tone="tertiary" style={{ flex: 1, lineHeight: 19 }}>
              Each input has a fixed ceiling, so every point can be traced back to something you
              logged. These are heuristics for spotting patterns, not medical or financial advice.
            </AppText>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
