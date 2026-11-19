import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BarChart } from '@/components/charts/bar-chart';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DeletableRow } from '@/components/ui/deletable-row';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Sheet } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { circadianSummary, formatClock } from '@/features/health/circadian';
import { useHealth } from '@/features/health/use-health';
import { formatDate } from '@/lib/format';
import { openAdd, openEdit } from '@/lib/navigation';
import { fonts, radius, space, useTheme } from '@/theme';

const TIMELINE_HOURS = 24;
const TIMELINE_START = 18;

const hoursFromStart = (hours: number) => (hours - TIMELINE_START + TIMELINE_HOURS) % TIMELINE_HOURS;

const CircadianTimeline = ({
  bedtime,
  wake,
  midpoint,
}: {
  bedtime: number;
  wake: number;
  midpoint: number;
}) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const duration = (wake - bedtime + TIMELINE_HOURS) % TIMELINE_HOURS || 8;
  const offset = hoursFromStart(bedtime);
  const midpointOffset = hoursFromStart(midpoint);
  const visibleDuration = Math.min(duration, TIMELINE_HOURS - offset);
  const percent = (hours: number) => `${(hours / TIMELINE_HOURS) * 100}%`;

  return (
    <View style={{ gap: 6 }}>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{
          height: 30,
          borderRadius: 999,
          backgroundColor: colors.surfaceSunken,
          overflow: 'hidden',
          justifyContent: 'center',
        }}
      >
        {width > 0 ? (
          <View
            style={{
              position: 'absolute',
              left: percent(offset),
              width: percent(visibleDuration),
              top: 0,
              bottom: 0,
              backgroundColor: colors.primary,
              borderRadius: 999,
            }}
          />
        ) : null}
        {width > 0 ? (
          <View
            style={{
              position: 'absolute',
              left: percent(midpointOffset),
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: colors.background,
            }}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {['18', '00', '06', '12', '18'].map((label, index) => (
          <AppText key={`${label}-${index}`} variant="mono" tone="tertiary">
            {label}
          </AppText>
        ))}
      </View>
    </View>
  );
};

const RhythmRing = ({ score }: { score: number | null }) => {
  const { colors } = useTheme();
  const size = 82;
  const stroke = 6;
  const mid = size / 2;
  const r = mid - stroke / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = score === null ? 0 : Math.max(0, Math.min(1, score / 100));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={mid}
          cy={mid}
          r={r}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={mid}
          cy={mid}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - ratio * circumference}
          rotation={-90}
          origin={`${mid}, ${mid}`}
        />
      </Svg>
      <AppText
        variant="headline"
        style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'], lineHeight: 22 }}
      >
        {score ?? '—'}
      </AppText>
      <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
        Rhythm
      </AppText>
    </View>
  );
};

export const SleepSegment = () => {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();
  const [plannerVisible, setPlannerVisible] = useState(false);
  const [targetWake, setTargetWake] = useState(7);
  const [targetDuration, setTargetDuration] = useState(7.5);

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const week = data.sleep.slice(0, 7);
  const avgHours = week.length
    ? week.reduce((sum, record) => sum + (record.sleep_duration_hours ?? 0), 0) / week.length
    : 0;
  const avgQuality = week.length
    ? week.reduce((sum, record) => sum + (record.sleep_quality ?? 0), 0) / week.length
    : 0;
  const durationChart = [...week]
    .reverse()
    .map((record) => ({
      label: String(new Date(record.created_at).getDate()),
      value: record.sleep_duration_hours ?? 0,
    }));

  const circadian = circadianSummary(data.sleep);
  const targetBedtime = (targetWake - targetDuration + TIMELINE_HOURS) % TIMELINE_HOURS;
  const shiftMinutes = circadian
    ? Math.round(
        ((((targetBedtime - circadian.avgBedtime + 36) % TIMELINE_HOURS) - 12) * 60),
      )
    : 0;
  const shiftDays = Math.max(1, Math.ceil(Math.abs(shiftMinutes) / 15));
  const windDown = targetBedtime - 1;
  const caffeineCutoff = targetBedtime - 8;
  const morningLight = targetWake + 0.5;
  const avgHoursValue = avgHours > 0 ? avgHours.toFixed(1) : '—';
  const avgQualityValue = avgQuality > 0 ? avgQuality.toFixed(1) : '—';

  const openPlanner = () => {
    if (circadian) {
      setTargetWake(Math.min(10, Math.max(4, Math.round(circadian.avgWake * 4) / 4)));
      setTargetDuration(
        Math.min(9.5, Math.max(6, Math.round(circadian.avgDuration * 2) / 2)),
      );
    }
    setPlannerVisible(true);
  };

  return (
    <>
      <Panel style={{ gap: space.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: space.md,
          }}
        >
          <View style={{ flex: 1, gap: space.xs }}>
            <AppText variant="footnote" tone="secondary">
              Average, 7 days
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
              <AppText
                variant="display"
                style={{ fontSize: 50, lineHeight: 54, letterSpacing: -2 }}
              >
                {avgHoursValue}
              </AppText>
              {avgHours > 0 ? (
                <AppText variant="headline" tone="secondary">
                  h
                </AppText>
              ) : null}
            </View>
            <AppText
              variant="footnote"
              tone={avgHours >= 7 ? 'primary' : 'secondary'}
              style={{ marginTop: space.xs }}
            >
              {avgHours === 0
                ? 'Log last night to start the trend.'
                : avgHours >= 7
                  ? 'Above the 7-hour target'
                  : `${(7 - avgHours).toFixed(1)} h below the 7-hour target`}
            </AppText>
          </View>
          <RhythmRing score={circadian?.consistencyScore ?? null} />
        </View>

        <View style={{ height: 1, backgroundColor: colors.separator }} />

        <StatRow>
          <Stat value={avgQualityValue} suffix="/10" label="Quality" />
          <Stat value={String(data.sleep.length)} label="Records" />
          <Stat
            value={circadian ? `±${circadian.midpointVariationMinutes}` : '—'}
            suffix={circadian ? 'min' : undefined}
            label={circadian ? `Midpoint ${formatClock(circadian.midpoint)}` : 'Midpoint'}
          />
        </StatRow>
      </Panel>

      <Button label="Log sleep" onPress={() => openAdd('sleep')} />

      {circadian ? (
        <Panel style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
            <AppText variant="headline" style={{ flex: 1 }}>
              {circadian.consistencyLabel}
            </AppText>
            <AppText variant="mono" tone="secondary">
              {formatClock(circadian.avgBedtime)} → {formatClock(circadian.avgWake)}
            </AppText>
          </View>

          <CircadianTimeline
            bedtime={circadian.avgBedtime}
            wake={circadian.avgWake}
            midpoint={circadian.midpoint}
          />

          <StatRow>
            <Stat value={formatClock(circadian.avgBedtime)} label="Bedtime" />
            <Stat value={formatClock(circadian.avgWake)} label="Wake" />
            <Stat value={`±${circadian.bedtimeVariationMinutes}`} suffix="m" label="Drift" />
          </StatRow>

          <Button label="Plan a shift" variant="secondary" size="small" onPress={openPlanner} />
        </Panel>
      ) : null}

      {durationChart.length > 1 ? (
        <View style={{ gap: space.md }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <AppText variant="headline">Duration</AppText>
            <AppText variant="footnote" tone="tertiary">
              Target 7–9 h
            </AppText>
          </View>
          <BarChart data={durationChart} maxValue={10} height={152} highlightLast />
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <AppText variant="headline" style={{ flex: 1 }}>
            History
          </AppText>
          <AppText variant="footnote" tone="tertiary">
            {data.sleep.length} nights
          </AppText>
        </View>
        {data.sleep.length === 0 ? (
          <EmptyState
            icon="moon"
            title="No sleep records"
            message="Log a night to start the trend."
            actionLabel="Log last night"
            onAction={() => openAdd('sleep')}
          />
        ) : (
          <Panel padded={false} style={{ paddingHorizontal: space.lg }}>
            {data.sleep.map((record, index) => (
              <DeletableRow
                key={record.id}
                icon="moon"
                title={`${(record.sleep_duration_hours ?? 0).toFixed(1)} hours`}
                subtitle={`${formatDate(record.created_at)}${record.notes ? ` · ${record.notes}` : ''}`}
                value={`Quality ${record.sleep_quality ?? '—'}/10`}
                last={index === data.sleep.length - 1}
                onPress={() => openEdit('sleep', record.id)}
                onDelete={() => deleteRecord.mutate({ table: 'sleep_records', id: record.id })}
              />
            ))}
          </Panel>
        )}
      </View>

      <Sheet
        compact
        headerless
        visible={plannerVisible}
        title="Plan a shift"
        onClose={() => setPlannerVisible(false)}
        footer={<Button label="Done" onPress={() => setPlannerVisible(false)} />}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
            marginTop: -space.sm,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="title">Plan a shift</AppText>
            <AppText variant="callout" tone="secondary">
              Anchor your wake time, then move bedtime in small steps.
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setPlannerVisible(false)}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon name="close" size={21} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <AppText variant="callout" tone="secondary">
              Target wake
            </AppText>
            <AppText variant="title" style={{ fontSize: 34, lineHeight: 38 }}>
              {formatClock(targetWake)}
            </AppText>
          </View>
          <Slider
            value={targetWake}
            onChange={setTargetWake}
            min={4}
            max={10}
            step={0.25}
          />
        </View>

        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <AppText variant="callout" tone="secondary">
              Sleep need
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
              <AppText variant="title" style={{ fontSize: 34, lineHeight: 38 }}>
                {targetDuration.toFixed(1)}
              </AppText>
              <AppText variant="callout" tone="tertiary">
                h
              </AppText>
            </View>
          </View>
          <Slider
            value={targetDuration}
            onChange={setTargetDuration}
            min={6}
            max={9.5}
            step={0.5}
          />
        </View>

        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
            TARGET WINDOW
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <AppText variant="display" style={{ fontSize: 42, lineHeight: 46, letterSpacing: -2 }}>
              {formatClock(targetBedtime)}
            </AppText>
            <AppText variant="display" tone="primary" style={{ fontSize: 30, lineHeight: 46 }}>
              →
            </AppText>
            <AppText variant="display" style={{ fontSize: 42, lineHeight: 46, letterSpacing: -2 }}>
              {formatClock(targetWake)}
            </AppText>
          </View>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.surfaceSunken, overflow: 'hidden', marginTop: space.xs }}>
            <View
              style={{
                position: 'absolute',
                left: `${(hoursFromStart(targetBedtime) / TIMELINE_HOURS) * 100}%`,
                width: `${(targetDuration / TIMELINE_HOURS) * 100}%`,
                top: 3,
                bottom: 3,
                borderRadius: 3,
                backgroundColor: '#B9A6FF',
              }}
            />
            {[
              { at: circadian?.avgBedtime ?? targetBedtime, color: colors.amber },
              { at: targetBedtime, color: '#B9A6FF' },
              { at: targetWake, color: colors.primary },
            ].map((marker, index) => (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: `${(hoursFromStart(marker.at) / TIMELINE_HOURS) * 100}%`,
                  top: 4,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: marker.color,
                }}
              />
            ))}
          </View>
          <AppText variant="footnote" tone="secondary">
            {Math.abs(shiftMinutes) < 15
              ? 'Already within 15 minutes of this window.'
              : `Move ${Math.abs(shiftMinutes)} min ${shiftMinutes < 0 ? 'earlier' : 'later'} at 15 min a day — about ${shiftDays} day${shiftDays === 1 ? '' : 's'}.`}
          </AppText>
        </View>

        <View style={{ gap: space.md, marginTop: space.sm }}>
          <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
            ANCHORS
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
            {[
              { icon: 'moon' as const, color: '#B9A6FF', value: formatClock(windDown), label: 'Wind down' },
              { icon: 'cafe' as const, color: colors.amber, value: formatClock(caffeineCutoff), label: 'Caffeine off' },
              { icon: 'sun' as const, color: colors.primary, value: formatClock(morningLight), label: 'Morning light' },
            ].map((anchor) => (
              <View key={anchor.label} style={{ flex: 1, gap: 2 }}>
                <Icon name={anchor.icon} size={24} color={anchor.color} />
                <AppText variant="title" style={{ fontSize: 28, lineHeight: 32 }}>
                  {anchor.value}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  {anchor.label}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </Sheet>
    </>
  );
};
