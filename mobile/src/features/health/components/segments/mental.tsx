import { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { MoodTrail, type MoodPoint } from '@/components/charts/mood-trail';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { MetricRail } from '@/components/ui/metric-rail';
import { Panel } from '@/components/ui/panel';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useHealth, type MentalRecord } from '@/features/health/use-health';
import { confirmDelete } from '@/lib/confirm';
import { formatStamp, isoDate } from '@/lib/format';
import { moodColor } from '@/lib/health-colors';
import { openAdd, openEdit } from '@/lib/navigation';
import { radius, space, useTheme } from '@/theme';

type RangeKey = '7' | '30';

const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
];

const moodLabel = (value: number | null) => {
  if (value === null) return 'Unlogged';
  if (value >= 8) return 'Bright';
  if (value >= 6) return 'Steady';
  if (value >= 4) return 'Mixed';
  return 'Low';
};

const stressColor = (
  value: number | null,
  colors: ReturnType<typeof useTheme>['colors'],
) => {
  if (value === null) return colors.textTertiary;
  if (value >= 7) return colors.danger;
  if (value >= 4) return colors.amber;
  return colors.success;
};

const energyColor = (
  value: number | null,
  colors: ReturnType<typeof useTheme>['colors'],
) => {
  if (value === null) return colors.textTertiary;
  if (value >= 7) return colors.primary;
  if (value >= 4) return colors.amber;
  return colors.danger;
};

const stressWord = (value: number | null) => {
  if (value === null) return 'Not logged';
  if (value >= 7) return 'High';
  if (value >= 4) return 'Moderate';
  return 'Low';
};

const energyWord = (value: number | null) => {
  if (value === null) return 'Not logged';
  if (value >= 7) return 'High';
  if (value >= 4) return 'Steady';
  return 'Low';
};

const anxietyWord = (value: number | null) => {
  if (value === null) return 'Not logged';
  if (value >= 7) return 'High';
  if (value >= 4) return 'Some';
  return 'Low';
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const MoodScale = ({ value, onSelect }: { value: number | null; onSelect: (value: number) => void }) => {
  const { colors } = useTheme();
  const active = value === null ? 0 : Math.round(value);

  return (
    <View style={{ gap: space.sm }}>
      <View
        style={{
          flexDirection: 'row',
          gap: 3,
          height: 12,
          borderRadius: radius.segment,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Set mood ${index + 1} of 10`}
            accessibilityState={{ selected: index < active }}
            hitSlop={{ top: 10, bottom: 10 }}
            onPress={() => onSelect(index + 1)}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: index < active ? colors.primary : colors.surfaceSunken,
              opacity: value === null ? 0.5 : pressed ? 0.7 : 1,
            })}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="tertiary">
          Low
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Bright
        </AppText>
      </View>
    </View>
  );
};

const MetaRow = ({
  label,
  value,
  detail,
  last,
}: {
  label: string;
  value: string;
  detail?: string;
  last?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: space.lg,
        paddingVertical: space.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.separator,
      }}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="callout">{label}</AppText>
        {detail ? (
          <AppText variant="footnote" tone="tertiary">
            {detail}
          </AppText>
        ) : null}
      </View>
      <AppText variant="headline" style={{ textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
};

const JournalEntry = ({
  record,
  last,
  onPress,
  onDelete,
}: {
  record: MentalRecord;
  last: boolean;
  onPress: () => void;
  onDelete: () => void;
}) => {
  const { colors } = useTheme();
  const mood = record.mood_rating;
  const accent = mood === null ? colors.textTertiary : moodColor(mood);
  const date = record.logged_at
    ? new Date(record.logged_at).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent check-in';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${date}, mood ${mood ?? 'not logged'}${record.notes ? `, ${record.notes}` : ''}`}
      accessibilityHint="Tap to edit, long press to delete"
      onPress={onPress}
      onLongPress={() => confirmDelete('check-in', onDelete)}
      delayLongPress={350}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Panel style={{ gap: space.sm, marginBottom: last ? 0 : space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="callout" style={{ fontWeight: '700' }}>
              {date}
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              {`Stress ${record.stress_level ?? '—'} · Energy ${record.energy_level ?? '—'} · Anxiety ${record.anxiety_level ?? '—'}`}
            </AppText>
            {record.notes ? (
              <AppText variant="body" tone="secondary" style={{ marginTop: space.xs }}>
                {record.notes}
              </AppText>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 0 }}>
            <AppText
              variant="numeric"
              style={{ color: accent, fontSize: 30, lineHeight: 33, minWidth: 28 }}
            >
              {mood ?? '—'}
            </AppText>
            <AppText
              variant="caption"
              style={{ color: accent, letterSpacing: 0.7, textAlign: 'right' }}
            >
              {moodLabel(mood)}
            </AppText>
          </View>
        </View>
      </Panel>
    </Pressable>
  );
};

export const MentalSegment = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();
  const [range, setRange] = useState<RangeKey>('7');
  const [showAll, setShowAll] = useState(false);

  const chartWidth = Math.max(0, Math.min(720, width) - 72);

  const rangeDays = Number(range);
  const inRange = useMemo(() => {
    if (!data) return [];
    const start = Date.now() - rangeDays * 86_400_000;
    return data.mental.filter(
      (record) => record.logged_at && new Date(record.logged_at).getTime() >= start,
    );
  }, [data, rangeDays]);

  const withMood = inRange.filter((record) => record.mood_rating !== null);

  const points = useMemo<MoodPoint[]>(() => {
    const days = new Map<string, { date: string; total: number; count: number }>();
    withMood.forEach((record) => {
      if (!record.logged_at || record.mood_rating === null) return;
      const date = isoDate(new Date(record.logged_at));
      const entry = days.get(date) ?? { date, total: 0, count: 0 };
      entry.total += record.mood_rating;
      entry.count += 1;
      days.set(date, entry);
    });
    return [...days.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({ date: entry.date, value: entry.total / entry.count }));
  }, [withMood]);

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  if (data.mental.length === 0) {
    return (
      <EmptyState
        icon="brain"
        title="No check-ins yet"
        message="Mood, stress and energy, with a place for what is on your mind."
        actionLabel="First check-in"
        onAction={() => openAdd('mental')}
      />
    );
  }

  const latest = data.mental[0];
  const latestMood = latest.mood_rating;
  const avgMood = average(points.map((point) => point.value));
  const lowCheckIns = withMood.filter((record) => (record.mood_rating ?? 10) <= 4).length;
  const highStress = inRange.filter((record) => (record.stress_level ?? 0) >= 7).length;

  const weekdayStats = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
  withMood.forEach((record) => {
    if (!record.logged_at || record.mood_rating === null) return;
    const day = new Date(record.logged_at).getDay();
    weekdayStats[day].total += record.mood_rating;
    weekdayStats[day].count += 1;
  });
  const bestDay = weekdayStats
    .map((entry, index) => ({
      index,
      value: entry.count ? entry.total / entry.count : 0,
      count: entry.count,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.value - a.value)[0];
  const bestDayName = bestDay
    ? new Date(2024, 0, 7 + bestDay.index).toLocaleDateString(undefined, { weekday: 'long' })
    : null;

  const chronological = [...withMood].reverse();
  const half = Math.floor(chronological.length / 2);
  const halfDelta =
    chronological.length >= 4 && half > 0
      ? average(chronological.slice(-half).map((record) => record.mood_rating ?? 0)) -
        average(chronological.slice(0, half).map((record) => record.mood_rating ?? 0))
      : null;
  const trendText =
    halfDelta === null
      ? null
      : Math.abs(halfDelta) < 0.3
        ? 'Mood is holding steady across this range.'
        : `Mood is ${halfDelta > 0 ? 'up' : 'down'} ${Math.abs(halfDelta).toFixed(1)} from the start of this range.`;

  const journal = showAll ? data.mental : data.mental.slice(0, 8);

  return (
    <>
      <Panel style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <AppText
            variant="numeric"
            style={{
              color: latestMood === null ? colors.textTertiary : moodColor(latestMood),
              fontSize: 60,
              lineHeight: 62,
            }}
          >
            {latestMood ?? '—'}
          </AppText>
          <View style={{ flex: 1, gap: 1 }}>
            <AppText variant="headline">{moodLabel(latestMood)}</AppText>
            <AppText variant="footnote" tone="tertiary">
              / 10 · {latest.logged_at ? formatStamp(new Date(latest.logged_at)) : 'No date'}
            </AppText>
          </View>
        </View>

        <MoodScale value={latestMood} onSelect={(mood) => openAdd('mental', { mood: String(mood) })} />

        <View style={{ height: 1, backgroundColor: colors.separator }} />

        <View style={{ gap: space.lg }}>
          <MetricRail
            label="Stress"
            value={latest.stress_level}
            color={colors.textSecondary}
            valueLabel={
              latest.stress_level === null
                ? 'Not logged'
                : `${latest.stress_level} / 10 · ${stressWord(latest.stress_level)}`
            }
          />
          <MetricRail
            label="Energy"
            value={latest.energy_level}
            color={colors.primary}
            valueLabel={
              latest.energy_level === null
                ? 'Not logged'
                : `${latest.energy_level} / 10 · ${energyWord(latest.energy_level)}`
            }
          />
          <MetricRail
            label="Anxiety"
            value={latest.anxiety_level}
            color={colors.textSecondary}
            valueLabel={
              latest.anxiety_level === null
                ? 'Not logged'
                : `${latest.anxiety_level} / 10 · ${anxietyWord(latest.anxiety_level)}`
            }
          />
        </View>
      </Panel>

      <Button label="Check in" onPress={() => openAdd('mental')} />

      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <AppText variant="headline" style={{ flex: 1 }}>
            Mood trail
          </AppText>
          <SegmentedControl
            label="Mood trail range"
            options={RANGES}
            value={range}
            onChange={setRange}
          />
        </View>
        {points.length ? (
          <AppText variant="footnote" tone="tertiary">
            {`${points.length} ${points.length === 1 ? 'day' : 'days'} · ${avgMood.toFixed(1)} average`}
          </AppText>
        ) : null}
      </View>

      {points.length > 0 ? (
        <Panel>
          <MoodTrail points={points} width={chartWidth} height={124} />
        </Panel>
      ) : (
        <AppText variant="footnote" tone="tertiary">
          No check-ins in this range. Try the 30-day view.
        </AppText>
      )}

      {withMood.length >= 2 && bestDayName ? (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <AppText variant="headline" style={{ flex: 1 }}>
              Patterns
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              Last {rangeDays} days
            </AppText>
          </View>
          <Panel style={{ paddingTop: space.xs, paddingBottom: space.md }}>
            <MetaRow
              label="Best day"
              value={bestDayName}
              detail={`${bestDay?.value.toFixed(1)} average mood`}
            />
            <MetaRow
              label="Low check-ins"
              value={`${lowCheckIns} of ${withMood.length}`}
              detail="mood 4 or below"
            />
            <MetaRow
              label="High stress"
              value={`${highStress} of ${inRange.length}`}
              detail="stress 7 or above"
              last
            />
            {trendText ? (
              <AppText variant="footnote" tone="primary" style={{ marginTop: space.md }}>
                {trendText}
              </AppText>
            ) : null}
          </Panel>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <AppText variant="headline" style={{ flex: 1 }}>
            Journal
          </AppText>
          <AppText variant="footnote" tone="tertiary">
            {data.mental.length} check-ins
          </AppText>
        </View>
        {journal.map((record, index) => (
          <JournalEntry
            key={record.id}
            record={record}
            last={index === journal.length - 1}
            onPress={() => openEdit('mental', record.id)}
            onDelete={() => deleteRecord.mutate({ table: 'mental_health_logs', id: record.id })}
          />
        ))}
      </View>

      {data.mental.length > 8 ? (
        <Button
          label={showAll ? 'Show fewer' : 'Show older'}
          variant="secondary"
          size="small"
          onPress={() => setShowAll((current) => !current)}
        />
      ) : null}
    </>
  );
};
