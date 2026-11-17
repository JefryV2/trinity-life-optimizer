import { useState } from 'react';
import { View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeletableRow } from '@/components/ui/deletable-row';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { circadianSummary, formatClock } from '@/features/health/circadian';
import { useHealth } from '@/features/health/use-health';
import { formatDate } from '@/lib/format';
import { openAdd, openEdit } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

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

  const chart = [...week]
    .reverse()
    .map((record) => ({
      label: formatDate(record.created_at),
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
      <Card raised style={{ gap: space.lg }}>
        <StatRow>
          <Stat
            value={avgHours > 0 ? avgHours.toFixed(1) : '—'}
            label="Avg hours, 7d"
            tone={avgHours >= 7 ? 'success' : 'default'}
          />
          <Stat value={avgQuality > 0 ? avgQuality.toFixed(1) : '—'} label="Quality, /10" />
          <Stat value={String(data.sleep.length)} label="Records" />
        </StatRow>
        <AppText variant="footnote" tone="secondary">
          {avgHours === 0
            ? 'Log last night to start the trend.'
            : avgHours >= 7
              ? 'Above the 7-hour target.'
              : `${(7 - avgHours).toFixed(1)} hours below the 7-hour target.`}
        </AppText>
        <Button label="Log sleep" onPress={() => openAdd('sleep')} />
      </Card>

      {circadian ? (
        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <View style={{ flex: 1, gap: space.xs }}>
              <AppText variant="caption" tone="tertiary">
                CIRCADIAN RHYTHM
              </AppText>
              <AppText variant="headline">{circadian.consistencyLabel}</AppText>
              <AppText variant="footnote" tone="secondary">
                Midpoint {formatClock(circadian.midpoint)} · ±
                {circadian.midpointVariationMinutes} min across {circadian.sampleSize} nights
              </AppText>
            </View>
            <RingMeter
              value={circadian.consistencyScore}
              max={100}
              size={66}
              stroke={6}
              color={colors.primary}
              center={`${circadian.consistencyScore}`}
              label="Rhythm"
            />
          </View>

          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
              <AppText variant="caption" tone="tertiary">
                SLEEP WINDOW
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
          </View>

          <StatRow>
            <Stat value={formatClock(circadian.avgBedtime)} label="Bedtime" />
            <Stat value={formatClock(circadian.avgWake)} label="Wake" />
            <Stat value={`±${circadian.bedtimeVariationMinutes}m`} label="Drift" />
          </StatRow>

          <Button
            label="Plan a shift"
            variant="secondary"
            size="small"
            onPress={openPlanner}
          />
        </Card>
      ) : null}

      {chart.length > 1 ? (
        <Card style={{ gap: space.md }}>
          <SectionHeader title="Duration" caption="Target: 7–9 hours" />
          <BarChart data={chart} maxValue={10} />
        </Card>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="History" />
        {data.sleep.length === 0 ? (
          <EmptyState
            icon="moon"
            title="No sleep records"
            message="Log a ni
ght to start the trend."
            actionLabel="Log last night"
            onAction={() => openAdd('sleep')}
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: space.xl }}>
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
          </Card>
        )}
      </View>

      <Sheet
        compact
        visible={plannerVisible}
        title="Plan a shift"
        subtitle="Anchor wake time, then move bedtime in small steps"
        onClose={() => setPlannerVisible(false)}
        footer={<Button label="Done" onPress={() => setPlannerVisible(false)} />}
      >
        <View style={{ gap: space.lg }}>
          <Slider
            label="Target wake"
            value={targetWake}
            onChange={setTargetWake}
            min={4}
            max={10}
            step={0.25}
            formatValue={formatClock}
          />
          <Slider
            label="Sleep need"
            value={targetDuration}
            onChange={setTargetDuration}
            min={6}
            max={9.5}
            step={0.5}
            formatValue={(value) => `${value.toFixed(1)} h`}
          />

          <View
            style={{
              gap: space.xs,
              borderTopWidth: 1,
              borderTopColor: colors.separator,
              paddingTop: space.lg,
            }}
          >
            <AppText variant="caption" tone="tertiary">
              TARGET WINDOW
            </AppText>
            <AppText variant="headline">
              {formatClock(targetBedtime)} → {formatClock(targetWake)}
            </AppText>
            <AppText variant="footnote" tone="secondary">
              {Math.abs(shiftMinutes) < 15
                ? 'Already within 15 minutes of this window.'
                : `Move ${Math.abs(shiftMinutes)} min ${shiftMinutes < 0 ? 'earlier' : 'later'} at 15 min a day — about ${shiftDays} day${shiftDays === 1 ? '' : 's'}.`}
            </AppText>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="tertiary">
              ANCHORS
            </AppText>
            <StatRow>
              <Stat value={formatClock(windDown)} label="Wind down" />
              <Stat value={formatClock(caffeineCutoff)} label="Caffeine off" />
              <Stat value={formatClock(morningLight)} label="Morning light" />
            </StatRow>
          </View>
        </View>
      </Sheet>
    </>
  );
};
