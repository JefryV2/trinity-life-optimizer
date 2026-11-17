import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips, MultiChips } from '@/components/ui/chips';
import { DeletableRow } from '@/components/ui/deletable-row';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Stat, StatRow } from '@/components/ui/stat';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { toast } from '@/components/ui/toast';
import {
  cycleStats,
  flowLabel,
  isoRange,
  ovulationDayFor,
  periodDaysFor,
  phaseAt,
  shiftIso,
} from '@/features/health/cycle';
import { useHealth } from '@/features/health/use-health';
import { useWomensDaily } from '@/features/health/womens-daily';
import { useProfile } from '@/features/profile/use-profile';
import { daysBetween, formatDate, formatLongDate, isoDate, startOfMonth } from '@/lib/format';
import { openAdd, openEdit } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const SYMPTOMS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Fatigue',
  'Acne',
  'Back pain',
  'Cravings',
  'Insomnia',
  'Nausea',
  'Tender breasts',
  'Dizziness',
  'Constipation',
];

const MOODS = [
  'Happy',
  'Calm',
  'Energetic',
  'Sad',
  'Anxious',
  'Irritable',
  'Mood swings',
  'Sensitive',
  'Low',
  'Tired',
];

const FLOW_OPTIONS: { value: FlowValue; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

type FlowValue = 'none' | 'light' | 'moderate' | 'heavy';

const canonicalValues = (values: string[], options: string[]) =>
  values.map(
    (value) => options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? value,
  );

const sentenceList = (values: string[]) => values.join(' · ');

const compactRange = (start: string, end: string) => {
  const a = formatDate(start);
  const b = formatDate(end);
  const [aMonth, aDay] = a.split(' ');
  const [bMonth, bDay] = b.split(' ');
  return aMonth === bMonth ? `${a}–${bDay}` : `${a} – ${b}`;
};

const topValues = (values: string[], options: string[], limit = 3) => {
  const counts = new Map<string, number>();
  for (const value of canonicalValues(values, options)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
};

const flowColor = (
  flow: string | null | undefined,
  colors: ReturnType<typeof useTheme>['colors'],
) => {
  switch (flow) {
    case 'light':
      return colors.success;
    case 'moderate':
    case 'medium':
      return colors.amber;
    case 'heavy':
      return colors.danger;
    default:
      return colors.textTertiary;
  }
};

const painColor = (value: number, colors: ReturnType<typeof useTheme>['colors']) => {
  if (value >= 7) return colors.danger;
  if (value >= 4) return colors.amber;
  return colors.success;
};

const normalizeFlow = (flow: string | null | undefined): FlowValue => {
  if (flow === 'light' || flow === 'moderate' || flow === 'medium' || flow === 'heavy') {
    return flow === 'medium' ? 'moderate' : flow;
  }
  return 'none';
};

const phaseColor = (key: string, colors: ReturnType<typeof useTheme>['colors']) => {
  switch (key) {
    case 'menstrual':
      return colors.danger;
    case 'ovulation':
      return colors.amber;
    case 'luteal':
      return colors.bonds;
    default:
      return colors.primary;
  }
};

const addMonth = (month: Date, delta: number) => {
  const next = new Date(month);
  next.setMonth(next.getMonth() + delta);
  return startOfMonth(next);
};

export const WomenSegment = () => {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();
  const { data: dailyData, saveLog } = useWomensDaily();
  const { data: profileData, saveCycleSettings } = useProfile();

  const [selectedDate, setSelectedDate] = useState(() => isoDate());
  const [month, setMonth] = useState(() => startOfMonth());
  const [logVisible, setLogVisible] = useState(false);
  const [logDate, setLogDate] = useState(() => isoDate());
  const [flow, setFlow] = useState<FlowValue>('none');
  const [moods, setMoods] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState(0);
  const [notes, setNotes] = useState('');
  const [logError, setLogError] = useState<string | null>(null);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const cycles = useMemo(() => data?.cycles ?? [], [data?.cycles]);
  const logs = useMemo(() => dailyData?.logs ?? [], [dailyData?.logs]);
  const stats = useMemo(() => cycleStats(cycles, 28, 5), [cycles]);
  const configuredCycle = profileData?.health?.cycle_length_days ?? null;
  const configuredPeriod = profileData?.health?.period_length_days ?? null;
  const effectiveCycleLength = configuredCycle ?? stats.averageLength;
  const effectivePeriodLength = configuredPeriod ?? stats.averagePeriod;

  const lastStart = cycles[0]?.cycle_start_date ?? null;
  const cycleDay = lastStart ? Math.max(1, daysBetween(lastStart, isoDate()) + 1) : null;
  const phase = cycleDay ? phaseAt(cycleDay, effectiveCycleLength, effectivePeriodLength) : null;
  const nextPeriod = lastStart ? shiftIso(lastStart, effectiveCycleLength) : null;
  const daysUntil = nextPeriod ? daysBetween(isoDate(), nextPeriod) : null;
  const ovulationDate = lastStart
    ? shiftIso(lastStart, ovulationDayFor(effectiveCycleLength, effectivePeriodLength) - 1)
    : null;
  const fertileStart = ovulationDate ? shiftIso(ovulationDate, -5) : null;
  const fertileEnd = ovulationDate ? shiftIso(ovulationDate, 1) : null;
  const late = cycleDay !== null && cycleDay > effectiveCycleLength;

  const todayLog = logs.find((entry) => entry.date === isoDate()) ?? null;
  const selectedLog = logs.find((entry) => entry.date === selectedDate) ?? null;

  const periodDates = useMemo(() => {
    const dates = new Set<string>();
    for (const cycle of cycles) {
      const end = cycle.cycle_end_date ?? shiftIso(cycle.cycle_start_date, periodDaysFor(cycle, effectivePeriodLength) - 1);
      for (const date of isoRange(cycle.cycle_start_date, end)) dates.add(date);
    }
    return dates;
  }, [cycles, effectivePeriodLength]);

  const predictedDates = useMemo(() => {
    const dates = new Set<string>();
    if (!lastStart) return dates;
    const expected = shiftIso(lastStart, effectiveCycleLength);
    const starts = [expected];
    if (expected >= isoDate()) {
      starts.push(shiftIso(expected, effectiveCycleLength));
      starts.push(shiftIso(expected, effectiveCycleLength * 2));
    }
    for (const start of starts) {
      for (const date of isoRange(start, shiftIso(start, effectivePeriodLength - 1))) dates.add(date);
    }
    return dates;
  }, [lastStart, effectiveCycleLength, effectivePeriodLength]);

  const fertileDates = useMemo(() => {
    const dates = new Set<string>();
    if (!lastStart) return dates;
    const starts = [
      lastStart,
      shiftIso(lastStart, effectiveCycleLength),
      shiftIso(lastStart, effectiveCycleLength * 2),
    ];
    for (const start of starts) {
      const ovulation = shiftIso(start, ovulationDayFor(effectiveCycleLength, effectivePeriodLength) - 1);
      for (const date of isoRange(shiftIso(ovulation, -5), shiftIso(ovulation, 1))) dates.add(date);
    }
    return dates;
  }, [lastStart, effectiveCycleLength, effectivePeriodLength]);

  const loggedDates = useMemo(() => new Set(logs.map((entry) => entry.date)), [logs]);
  const topSymptoms = useMemo(
    () => topValues(logs.flatMap((entry) => entry.symptoms ?? []), SYMPTOMS),
    [logs],
  );
  const topMoods = useMemo(
    () => topValues(logs.flatMap((entry) => entry.moods ?? []), MOODS),
    [logs],
  );

  const monthOffset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: monthOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_value, index) =>
      isoDate(new Date(month.getFullYear(), month.getMonth(), index + 1, 12)),
    ),
  ];

  const openLog = (date: string) => {
    const entry = logs.find((log) => log.date === date);
    setLogDate(date);
    setFlow(normalizeFlow(entry?.flow_intensity));
    setMoods(canonicalValues(entry?.moods ?? [], MOODS));
    setSymptoms(canonicalValues(entry?.symptoms ?? [], SYMPTOMS));
    setPain(entry?.pain_level ?? 0);
    setNotes(entry?.notes ?? '');
    setLogError(null);
    setLogVisible(true);
  };

  const saveDaily = async () => {
    setLogError(null);
    try {
      await saveLog.mutateAsync({
        date: logDate,
        flow: flow === 'none' ? null : flow,
        moods,
        symptoms,
        pain,
        notes,
      });
      setSelectedDate(logDate);
      setLogVisible(false);
      toast.show('Check-in saved');
    } catch (caught) {
      setLogError(caught instanceof Error ? caught.message : 'Could not save this check-in.');
    }
  };

  const openSettings = () => {
    setCycleLength(effectiveCycleLength);
    setPeriodLength(effectivePeriodLength);
    setSettingsError(null);
    setSettingsVisible(true);
  };

  const saveSettings = async () => {
    setSettingsError(null);
    try {
      await saveCycleSettings.mutateAsync({
        cycleLengthDays: cycleLength,
        periodLengthDays: periodLength,
      });
      setSettingsVisible(false);
      toast.show('Cycle settings saved');
    } catch (caught) {
      setSettingsError(caught instanceof Error ? caught.message : 'Could not save cycle settings.');
    }
  };

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const phaseParts = [
    { key: 'menstrual', label: 'Period', days: effectivePeriodLength, color: colors.danger },
    {
      key: 'follicular',
      label: 'Follicular',
      days: Math.max(1, ovulationDayFor(effectiveCycleLength, effectivePeriodLength) - effectivePeriodLength - 2),
      color: colors.primary,
    },
    { key: 'ovulation', label: 'Peak', days: 3, color: colors.amber },
    {
      key: 'luteal',
      label: 'Luteal',
      days: Math.max(
        1,
        effectiveCycleLength -
          effectivePeriodLength -
          Math.max(1, ovulationDayFor(effectiveCycleLength, effectivePeriodLength) - effectivePeriodLength - 2) -
          3,
      ),
      color: colors.bonds,
    },
  ];

  return (
    <>
      <SectionHeader
        title="Cycle"
        caption={cycles.length > 0 ? `${stats.regularity} · ${cycles.length} logged` : undefined}
        actionLabel="Settings"
        onAction={openSettings}
      />

      {lastStart && cycleDay && phase ? (
        <Card raised style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
            <RingMeter
              value={Math.min(cycleDay, effectiveCycleLength)}
              max={effectiveCycleLength}
              size={118}
              stroke={9}
              color={phaseColor(phase.key, colors)}
              center={String(cycleDay)}
              label="Cycle day"
            />
            <View style={{ flex: 1, gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: late ? colors.danger : phaseColor(phase.key, colors),
                  }}
                />
                <AppText variant="headline" style={{ flex: 1 }}>
                  {late ? 'Period late' : `${phase.name} phase`}
                </AppText>
              </View>
              <AppText variant="footnote" tone="secondary">
                {late
                  ? `Expected ${daysUntil !== null ? Math.abs(daysUntil) : 0} days ago. Update your cycle when it starts.`
                  : phase.note}
              </AppText>
              {daysUntil !== null && !late ? (
                <AppText variant="footnote" tone="primary">
                  {daysUntil > 0
                    ? `Next period in ~${daysUntil} day${daysUntil === 1 ? '' : 's'}`
                    : daysUntil === 0
                      ? 'Period expected today'
                      : 'Period expected'}
                </AppText>
              ) : null}
              {fertileStart && fertileEnd ? (
                <AppText variant="footnote" tone="tertiary">
                  Fertile: {compactRange(fertileStart, fertileEnd)}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 3 }}>
            {phaseParts.map((part) => {
              const active = part.key === phase.key || (late && part.key === 'luteal');
              return (
                <View key={part.key} style={{ flex: part.days, gap: 5 }}>
                  <View
                    style={{
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: part.color,
                      opacity: active ? 1 : 0.22,
                    }}
                  />
                  <AppText variant="caption" tone={active ? 'secondary' : 'tertiary'} numberOfLines={1}>
                    {part.label}
                  </AppText>
                </View>
              );
            })}
          </View>
          <AppText variant="caption" tone="tertiary">
            Estimates only. Cycle dates can shift with stress, sleep and travel.
          </AppText>
        </Card>
      ) : (
        <EmptyState
          icon="female"
          title="Start with your last period"
          message="Log the first day of your last period. Auxo will estimate your phase, fertile window and next cycle."
          actionLabel="Log last period"
          onAction={() => openAdd('cycle')}
        />
      )}

      <SectionHeader
        title="Today"
        caption={todayLog ? 'Logged' : undefined}
      />
      {todayLog ? (
        <Card style={{ gap: space.md }}>
          <StatRow>
            <Stat
              value={flowLabel(todayLog.flow_intensity)}
              label="Flow"
              color={flowColor(todayLog.flow_intensity, colors)}
            />
            <Stat
              value={`${todayLog.pain_level ?? 0}/10`}
              label="Pain"
              color={painColor(todayLog.pain_level ?? 0, colors)}
            />
            <Stat
              value={String(todayLog.symptoms?.length ?? 0)}
              label={`Symptom${todayLog.symptoms?.length === 1 ? '' : 's'}`}
            />
          </StatRow>
          {todayLog.symptoms?.length ? (
            <AppText variant="footnote" tone="secondary">
              {sentenceList(canonicalValues(todayLog.symptoms, SYMPTOMS))}
            </AppText>
          ) : null}
          {todayLog.moods?.length ? (
            <AppText variant="footnote" tone="tertiary">
              Mood: {canonicalValues(todayLog.moods, MOODS).join(', ')}
            </AppText>
          ) : null}
          <Button
            label="Update today's check-in"
            variant="secondary"
            size="small"
            onPress={() => openLog(isoDate())}
          />
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          <AppText variant="body" tone="secondary">
            A quick check-in sharpens predictions and shows patterns in symptoms.
          </AppText>
          <Button
            label="Log today's check-in"
            variant="secondary"
            size="small"
            onPress={() => openLog(isoDate())}
          />
        </Card>
      )}

      <SectionHeader title="Calendar" caption="Tap a day to check in" />
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => {
              const next = addMonth(month, -1);
              setMonth(next);
              setSelectedDate(isoDate(next));
            }}
            hitSlop={10}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="back" size={17} color={colors.textSecondary} />
          </Pressable>
          <AppText variant="headline" style={{ flex: 1, textAlign: 'center' }}>
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => {
              const next = addMonth(month, 1);
              setMonth(next);
              setSelectedDate(isoDate(next));
            }}
            hitSlop={10}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevron" size={17} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((day, index) => (
            <AppText
              key={`${day}-${index}`}
              variant="mono"
              tone="tertiary"
              style={{ width: '14.2857%', textAlign: 'center' }}
            >
              {day}
            </AppText>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {calendarCells.map((date, index) => {
            if (!date) {
              return <View key={`blank-${index}`} style={{ width: '14.2857%', height: 44 }} />;
            }
            const selected = date === selectedDate;
            const actual = periodDates.has(date);
            const predicted = !actual && predictedDates.has(date);
            const fertile = fertileDates.has(date);
            const logged = loggedDates.has(date);
            const today = date === isoDate();
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={formatDate(date)}
                accessibilityState={{ selected }}
                onPress={() => setSelectedDate(date)}
                style={{ width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.primary : actual ? colors.danger : 'transparent',
                    borderWidth: !selected && (predicted || today) ? 1 : 0,
                    borderColor: today ? colors.primary : colors.danger,
                  }}
                >
                  <AppText
                    variant="footnote"
                    style={{
                      color: selected || actual ? colors.onPrimary : predicted ? colors.danger : undefined,
                    }}
                    tone={selected || actual || predicted || today ? 'default' : 'secondary'}
                  >
                    {Number(date.slice(-2))}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 3, height: 5, marginTop: 1 }}>
                  {fertile ? (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.amber }} />
                  ) : null}
                  {logged ? (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.bonds }} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
            <AppText variant="caption" tone="tertiary">Period</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.danger }} />
            <AppText variant="caption" tone="tertiary">Predicted</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber }} />
            <AppText variant="caption" tone="tertiary">Fertile</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.bonds }} />
            <AppText variant="caption" tone="tertiary">Check-in</AppText>
          </View>
        </View>

        {selectedDate !== isoDate() ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: space.md, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="headline">{formatLongDate(selectedDate)}</AppText>
                <AppText variant="footnote" tone="secondary">
                  {selectedLog
                    ? `${flowLabel(selectedLog.flow_intensity)} flow · pain ${selectedLog.pain_level ?? 0}/10${selectedLog.symptoms?.length ? ` · ${selectedLog.symptoms.length} symptom${selectedLog.symptoms.length === 1 ? '' : 's'}` : ''}`
                    : selectedDate > isoDate()
                      ? 'Future day'
                      : 'No check-in yet'}
                </AppText>
              </View>
              {selectedDate < isoDate() ? (
                <Button
                  label={selectedLog ? 'Edit' : 'Check in'}
                  size="small"
                  variant={selectedLog ? 'secondary' : 'primary'}
                  onPress={() => openLog(selectedDate)}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </Card>

      {stats.sampleSize >= 2 ? (
        <>
          <SectionHeader title="Patterns" caption={`Based on ${stats.sampleSize} completed cycles`} />
          <Card style={{ gap: space.md }}>
            <StatRow>
              <Stat value={`${stats.averageLength}d`} label="Avg cycle" />
              <Stat value={`${stats.averagePeriod}d`} label="Avg period" />
              <Stat value={String(cycles.length)} label="Cycles" />
            </StatRow>
            <AppText variant="footnote" tone="secondary">
              {stats.regularity}. Your shortest cycle was {stats.shortest} days and your longest was {stats.longest}.
            </AppText>
            {topSymptoms.length > 0 ? (
              <AppText variant="footnote" tone="secondary">
                Most logged: {topSymptoms.map(([label, count]) => `${label} (${count})`).join(' · ')}
              </AppText>
            ) : null}
            {topMoods.length > 0 ? (
              <AppText variant="footnote" tone="tertiary">
                Moods: {topMoods.map(([label, count]) => `${label} (${count})`).join(' · ')}
              </AppText>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionHeader
        title="Cycle history"
        caption={cycles.length > 0 ? `${cycles.length} logged` : undefined}
        actionLabel="Add"
        onAction={() => openAdd('cycle')}
      />
      {cycles.length === 0 ? (
        <Card>
          <AppText variant="body" tone="secondary">
            Log the first day of each period to build a clearer picture.
          </AppText>
        </Card>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.xl }}>
          {cycles.map((cycle, index) => {
            const length =
              index === 0
                ? null
                : Math.round(
                    (new Date(`${cycles[index - 1].cycle_start_date}T12:00:00`).getTime() -
                      new Date(`${cycle.cycle_start_date}T12:00:00`).getTime()) /
                      86_400_000,
                  );
            return (
              <DeletableRow
                key={cycle.id}
                leading={
                  <View style={{ width: 24, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 5,
                        backgroundColor: flowColor(cycle.flow_intensity, colors),
                      }}
                    />
                  </View>
                }
                title={formatDate(cycle.cycle_start_date)}
                subtitle={`${periodDaysFor(cycle, effectivePeriodLength)} day period · ${flowLabel(cycle.flow_intensity)} flow${cycle.pain_level ? ` · pain ${cycle.pain_level}/10` : ''}`}
                value={length ? `${length} d cycle` : 'Current'}
                last={index === cycles.length - 1}
                onPress={() => openEdit('cycle', cycle.id)}
                onDelete={() => deleteRecord.mutate({ table: 'menstrual_cycles', id: cycle.id })}
              />
            );
          })}
        </Card>
      )}

      <Sheet
        compact
        visible={logVisible}
        title="Daily check-in"
        subtitle={formatLongDate(logDate)}
        onClose={() => setLogVisible(false)}
        footer={
          <Button
            label="Save check-in"
            loading={saveLog.isPending}
            onPress={() => void saveDaily()}
          />
        }
      >
        <View style={{ gap: space.lg }}>
          <Chips label="Flow" options={FLOW_OPTIONS} value={flow} onChange={setFlow} />
          <MultiChips
            label="Symptoms"
            options={SYMPTOMS.map((symptom) => ({ value: symptom, label: symptom }))}
            values={symptoms}
            onChange={setSymptoms}
          />
          <MultiChips
            label="Mood"
            options={MOODS.map((mood) => ({ value: mood, label: mood }))}
            values={moods}
            onChange={setMoods}
          />
          <Slider
            label="Pain"
            value={pain}
            onChange={setPain}
            min={0}
            max={10}
            formatValue={(value) => `${value}/10`}
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything worth remembering"
            multiline
            maxLength={300}
          />
          {logError ? (
            <AppText variant="footnote" tone="danger">
              {logError}
            </AppText>
          ) : null}
        </View>
      </Sheet>

      <Sheet
        compact
        visible={settingsVisible}
        title="Cycle settings"
        subtitle="Used for predictions across the app"
        onClose={() => setSettingsVisible(false)}
        footer={
          <Button
            label="Save settings"
            loading={saveCycleSettings.isPending}
            onPress={() => void saveSettings()}
          />
        }
      >
        <View style={{ gap: space.lg }}>
          <Slider
            label="Cycle length"
            value={cycleLength}
            onChange={setCycleLength}
            min={21}
            max={45}
            formatValue={(value) => `${value} days`}
          />
          <Slider
            label="Period length"
            value={periodLength}
            onChange={setPeriodLength}
            min={2}
            max={10}
            formatValue={(value) => `${value} days`}
          />
          <AppText variant="footnote" tone="tertiary">
            {stats.sampleSize > 0
              ? `Your logged cycles average ${stats.averageLength} days, with a ${stats.averagePeriod}-day period.`
              : 'Log two cycles and Auxo will start filling in your averages.'}
          </AppText>
          <AppText variant="footnote" tone="tertiary">
            Predictions are estimates, not contraception or medical advice.
          </AppText>
          {settingsError ? (
            <AppText variant="footnote" tone="danger">
              {settingsError}
            </AppText>
          ) : null}
        </View>
      </Sheet>
    </>
  );
};
