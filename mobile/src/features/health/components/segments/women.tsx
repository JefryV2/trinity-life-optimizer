import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DeletableRow } from '@/components/ui/deletable-row';
import { Icon, type IconName } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Sheet } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { ErrorState, LoadingState } from '@/components/ui/states';
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
import { CycleLogSheet, CycleSettingsSheet } from '@/features/health/components/cycle-sheets';
import { useHealth } from '@/features/health/use-health';
import { useWomensDaily } from '@/features/health/womens-daily';
import { useProfile } from '@/features/profile/use-profile';
import { daysBetween, formatDate, formatLongDate, isoDate, startOfMonth } from '@/lib/format';
import { openEdit } from '@/lib/navigation';
import { fonts, radius, space, useTheme } from '@/theme';

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

type FlowValue = 'none' | 'light' | 'moderate' | 'heavy';

const FLOW_OPTIONS: { value: FlowValue; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

const canonicalValues = (values: string[], options: string[]) =>
  values.map(
    (value) => options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? value,
  );

const compactRange = (start: string, end: string) => {
  const a = formatDate(start);
  const b = formatDate(end);
  const [aMonth, aDay] = a.split(' ');
  const [bMonth, bDay] = b.split(' ');
  return aMonth === bMonth ? `${a}–${bDay}` : `${a} – ${b}`;
};

const normalizeFlow = (flow: string | null | undefined): FlowValue => {
  if (flow === 'light' || flow === 'moderate' || flow === 'medium' || flow === 'heavy') {
    return flow === 'medium' ? 'moderate' : flow;
  }
  return 'none';
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

const addMonth = (month: Date, delta: number) => {
  const next = new Date(month);
  next.setMonth(next.getMonth() + delta);
  return startOfMonth(next);
};

const SectionTitle = ({
  title,
  right,
  onRight,
}: {
  title: string;
  right?: string;
  onRight?: () => void;
}) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <AppText
        style={{
          flex: 1,
          fontSize: 20,
          lineHeight: 25,
          fontFamily: fonts.black,
          letterSpacing: -0.6,
        }}
      >
        {title}
      </AppText>
      {right ? (
        onRight ? (
          <Pressable accessibilityRole="button" onPress={onRight} hitSlop={10}>
            <AppText variant="caption" tone="primary">
              {right}
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="footnote" tone="tertiary">
            {right}
          </AppText>
        )
      ) : null}
    </View>
  );
};

const SYMPTOM_META: Record<string, IconName> = {
  Cramps: 'pulse',
  Headache: 'headache',
  Bloating: 'bloating',
  Fatigue: 'battery',
  Acne: 'acne',
  'Back pain': 'backPain',
  Cravings: 'fruit',
  Insomnia: 'insomnia',
  Nausea: 'nausea',
  'Tender breasts': 'tender',
  Dizziness: 'dizzy',
  Constipation: 'constipation',
};

const CycleStrip = ({
  cycleDay,
  cycleLength,
  periodLength,
  startDate,
  endDate,
  parts,
}: {
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  startDate: string;
  endDate: string;
  parts: Array<{ key: string; color: string }>;
}) => {
  const { colors } = useTheme();
  const colorFor = (key: string) =>
    parts.find((part) => part.key === key)?.color ?? colors.primary;
  const today = Math.min(cycleDay, cycleLength);

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 54 }}>
        {Array.from({ length: cycleLength }, (_value, index) => {
          const day = index + 1;
          const phase = phaseAt(day, cycleLength, periodLength);
          const current = day === today;
          return (
            <View
              key={day}
              style={{
                flex: 1,
                height: current ? 52 : 44,
                borderRadius: 6,
                backgroundColor: colorFor(phase.key),
                borderWidth: current ? 2 : 0,
                borderColor: colors.text,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="mono" tone="tertiary">
          {formatDate(startDate)}
        </AppText>
        <AppText variant="mono" tone="secondary">
          Today · {formatDate(isoDate())}
        </AppText>
        <AppText variant="mono" tone="tertiary">
          {formatDate(endDate)}
        </AppText>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: space.md,
          rowGap: space.xs,
        }}
      >
        {parts.map((part) => (
          <View key={part.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: part.color }} />
            <AppText variant="caption" tone="secondary">
              {part.key === 'menstrual'
                ? 'Period'
                : part.key === 'follicular'
                  ? 'Follicular'
                  : part.key === 'ovulation'
                    ? 'Peak'
                    : 'Luteal'}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

const FlowSegment = ({ value, onChange }: { value: FlowValue; onChange: (value: FlowValue) => void }) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" tone="secondary">
        Flow
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceSunken,
          padding: 4,
          gap: 2,
        }}
      >
        {FLOW_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 46,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <AppText
                tone={selected ? 'onPrimary' : 'secondary'}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontSize: 13, fontWeight: selected ? '800' : '500' }}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const SymptomGrid = ({
  values,
  onToggle,
}: {
  values: string[];
  onToggle: (value: string) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {SYMPTOMS.map((symptom) => {
        const selected = values.includes(symptom);
        return (
          <Pressable
            key={symptom}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => onToggle(symptom)}
            style={({ pressed }) => ({
              width: '23%',
              minHeight: 76,
              borderRadius: radius.inner,
              backgroundColor: selected ? colors.primary : colors.surfaceSunken,
              borderWidth: selected ? 0 : 1,
              borderColor: colors.separator,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              paddingHorizontal: 4,
              paddingVertical: 8,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Icon
              name={SYMPTOM_META[symptom] ?? 'pulse'}
              size={22}
              color={selected ? colors.onPrimary : colors.primary}
            />
            <AppText
              style={{
                fontSize: 11,
                lineHeight: 15,
                textAlign: 'center',
                color: selected ? colors.onPrimary : colors.textSecondary,
                fontWeight: selected ? '700' : '500',
              }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {symptom}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const MoodChoices = ({
  values,
  onToggle,
}: {
  values: string[];
  onToggle: (value: string) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {MOODS.map((mood) => {
        const selected = values.includes(mood);
        return (
          <Pressable
            key={mood}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => onToggle(mood)}
            style={({ pressed }) => ({
              minHeight: 38,
              paddingHorizontal: space.lg,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.bonds : colors.surfaceSunken,
              borderWidth: 1,
              borderColor: selected ? colors.bonds : colors.separator,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <AppText
              style={{
                fontSize: 13,
                fontWeight: selected ? '700' : '500',
                color: selected ? '#FFFFFF' : colors.textSecondary,
              }}
            >
              {mood}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const PainField = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="secondary">
          Pain
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <AppText style={{ fontSize: 26, lineHeight: 30, fontFamily: fonts.black }}>{value}</AppText>
          <AppText variant="footnote" tone="tertiary">
            /10
          </AppText>
        </View>
      </View>
      <Slider value={value} onChange={onChange} min={0} max={10} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="footnote" tone="tertiary">
          None
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          Severe
        </AppText>
      </View>
    </View>
  );
};

const StatCell = ({ value, label }: { value: string; label: string }) => (
  <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
    <AppText style={{ fontSize: 26, lineHeight: 30, fontFamily: fonts.black, color: '#C6F24E' }}>
      {value}
    </AppText>
    <AppText variant="footnote" tone="secondary" numberOfLines={1}>
      {label}
    </AppText>
  </View>
);

export const WomenSegment = () => {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();
  const { data: dailyData, saveLog } = useWomensDaily();
  const { data: profileData } = useProfile();

  const [selectedDate, setSelectedDate] = useState(() => isoDate());
  const [month, setMonth] = useState(() => startOfMonth());
  const [monthView, setMonthView] = useState(false);
  const [logVisible, setLogVisible] = useState(false);
  const [logDate, setLogDate] = useState(() => isoDate());
  const [flow, setFlow] = useState<FlowValue>('none');
  const [moods, setMoods] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState(0);
  const [notes, setNotes] = useState('');
  const [logError, setLogError] = useState<string | null>(null);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [cycleLogVisible, setCycleLogVisible] = useState(false);

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
      const end =
        cycle.cycle_end_date ??
        shiftIso(cycle.cycle_start_date, periodDaysFor(cycle, effectivePeriodLength) - 1);
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
      for (const date of isoRange(start, shiftIso(start, effectivePeriodLength - 1))) {
        dates.add(date);
      }
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
      const ovulation = shiftIso(
        start,
        ovulationDayFor(effectiveCycleLength, effectivePeriodLength) - 1,
      );
      for (const date of isoRange(shiftIso(ovulation, -5), shiftIso(ovulation, 1))) {
        dates.add(date);
      }
    }
    return dates;
  }, [lastStart, effectiveCycleLength, effectivePeriodLength]);

  const loggedDates = useMemo(() => new Set(logs.map((entry) => entry.date)), [logs]);

  const monthOffset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: monthOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_value, index) =>
      isoDate(new Date(month.getFullYear(), month.getMonth(), index + 1, 12)),
    ),
  ];

  const latestPeriod = cycles[0] ?? null;
  const latestPeriodEnd = latestPeriod
    ? latestPeriod.cycle_end_date ??
      shiftIso(
        latestPeriod.cycle_start_date,
        periodDaysFor(latestPeriod, effectivePeriodLength) - 1,
      )
    : null;
  const latestPeriodDays = latestPeriod ? periodDaysFor(latestPeriod, effectivePeriodLength) : 0;
  const latestPeriodRange =
    latestPeriod && latestPeriodEnd
      ? compactRange(latestPeriod.cycle_start_date, latestPeriodEnd)
      : null;

  const follicularDays = Math.max(
    1,
    ovulationDayFor(effectiveCycleLength, effectivePeriodLength) - effectivePeriodLength - 2,
  );
  const lutealDays = Math.max(
    1,
    effectiveCycleLength - effectivePeriodLength - follicularDays - 3,
  );

  const phaseParts = [
    { key: 'menstrual', label: 'Period', days: effectivePeriodLength, color: colors.danger },
    {
      key: 'follicular',
      label: 'Follicular',
      days: follicularDays,
      color: colors.primary,
    },
    { key: 'ovulation', label: 'Peak', days: 3, color: '#E2F46F' },
    {
      key: 'luteal',
      label: 'Luteal',
      days: lutealDays,
      color: 'rgba(198,242,78,0.30)',
    },
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
    setSettingsVisible(true);
  };

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const cycleEnd = lastStart ? shiftIso(lastStart, effectiveCycleLength - 1) : null;
  const checkinBadge =
    cycleDay && phase
      ? phase.key === 'menstrual'
        ? `Period · day ${cycleDay}`
        : `${phase.name} · day ${cycleDay}`
      : undefined;

  const todayPills: Array<{ label: string; color: string; background: string }> = [];
  if (todayLog) {
    if (todayLog.flow_intensity && todayLog.flow_intensity !== 'none') {
      todayPills.push({
        label: `${flowLabel(todayLog.flow_intensity)} flow`,
        color: colors.danger,
        background: 'rgba(255,107,90,0.16)',
      });
    }
    if ((todayLog.pain_level ?? 0) > 0) {
      todayPills.push({
        label: `Pain ${todayLog.pain_level}/10`,
        color: colors.primary,
        background: 'rgba(198,242,78,0.14)',
      });
    }
    for (const symptom of (todayLog.symptoms ?? []).slice(0, 2)) {
      todayPills.push({
        label: symptom,
        color: colors.textSecondary,
        background: colors.surfaceSunken,
      });
    }
    for (const mood of (todayLog.moods ?? []).slice(0, 3)) {
      const calm = mood.toLowerCase() === 'calm' || mood.toLowerCase() === 'happy';
      todayPills.push({
        label: mood,
        color: calm ? colors.primary : colors.textSecondary,
        background: calm ? 'rgba(198,242,78,0.14)' : colors.surfaceSunken,
      });
    }
  }

  const toggleSymptom = (symptom: string) => {
    setSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((value) => value !== symptom)
        : [...current, symptom],
    );
  };

  const toggleMood = (mood: string) => {
    setMoods((current) =>
      current.includes(mood) ? current.filter((value) => value !== mood) : [...current, mood],
    );
  };

  return (
    <>
      <View style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <AppText
            style={{
              fontSize: 84,
              lineHeight: 88,
              fontFamily: fonts.black,
              letterSpacing: -5,
              color: colors.primary,
              minWidth: 56,
            }}
          >
            {cycleDay ?? '—'}
          </AppText>
          <View style={{ flex: 1, gap: 2, paddingTop: 8 }}>
            <AppText variant="caption" tone="tertiary">
              Cycle day
            </AppText>
            <AppText
              style={{
                fontSize: 28,
                lineHeight: 32,
                fontFamily: fonts.black,
                letterSpacing: -1,
              }}
            >
              {late ? 'Late' : phase?.name ?? 'No cycle yet'}
            </AppText>
            <AppText variant="body" tone="secondary">
              {late
                ? `Expected ${daysUntil !== null ? Math.abs(daysUntil) : 0} days ago. Log your cycle when it starts.`
                : phase?.note ?? 'Log your last period to see your phase.'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cycle settings"
            onPress={openSettings}
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="settings" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {lastStart && cycleDay && phase ? (
          <>
            <Panel style={{ gap: space.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                }}
              >
                <AppText style={{ flex: 1, fontSize: 20, lineHeight: 25, fontFamily: fonts.bold }}>
                  This cycle
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setMonthView((open) => !open)}
                  hitSlop={10}
                >
                  <AppText variant="caption" tone="primary">
                    {monthView ? 'Cycle view' : 'Month view'}
                  </AppText>
                </Pressable>
              </View>

              {monthView ? (
                <View style={{ gap: space.md }}>
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
                    <AppText variant="callout" style={{ flex: 1, textAlign: 'center' }}>
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
                        return (
                          <View
                            key={`blank-${index}`}
                            style={{ width: '14.2857%', height: 44 }}
                          />
                        );
                      }
                      const selected = date === selectedDate;
                      const actual = periodDates.has(date);
                      const predicted = !actual && predictedDates.has(date);
                      const fertile = fertileDates.has(date);
                      const logged = loggedDates.has(date);
                      const today = date === isoDate();
                      const runStart = actual && !periodDates.has(shiftIso(date, -1));
                      const runEnd = actual && !periodDates.has(shiftIso(date, 1));
                      return (
                        <Pressable
                          key={date}
                          accessibilityRole="button"
                          accessibilityLabel={formatDate(date)}
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedDate(date)}
                          style={{
                            width: '14.2857%',
                            height: 44,
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            paddingTop: 3,
                          }}
                        >
                          {actual ? (
                            <View
                              style={{
                                position: 'absolute',
                                left: runStart ? 4 : 0,
                                right: runEnd ? 4 : 0,
                                top: 3,
                                height: 33,
                                backgroundColor: colors.danger,
                                borderTopLeftRadius: runStart ? 17 : 0,
                                borderBottomLeftRadius: runStart ? 17 : 0,
                                borderTopRightRadius: runEnd ? 17 : 0,
                                borderBottomRightRadius: runEnd ? 17 : 0,
                              }}
                            />
                          ) : null}
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: radius.pill,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: selected ? colors.primary : 'transparent',
                              borderWidth: !selected && predicted ? 1 : 0,
                              borderColor: colors.danger,
                            }}
                          >
                            <AppText
                              variant="footnote"
                              style={{
                                color: selected
                                  ? colors.onPrimary
                                  : actual
                                    ? colors.onPrimary
                                    : predicted
                                      ? colors.danger
                                      : today
                                        ? colors.primary
                                        : undefined,
                                fontWeight: today || selected ? '800' : '500',
                              }}
                            >
                              {Number(date.slice(-2))}
                            </AppText>
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              gap: 3,
                              height: 7,
                              alignItems: 'center',
                            }}
                          >
                            {fertile ? (
                              <View
                                style={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: colors.amber,
                                }}
                              />
                            ) : null}
                            {logged ? (
                              <View
                                style={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: colors.bonds,
                                }}
                              />
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.separator,
                      paddingTop: space.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                    }}
                  >
                    <AppText
                      variant="footnote"
                      style={{
                        flex: 1,
                        color: colors.danger,
                        fontFamily: fonts.bold,
                      }}
                      numberOfLines={1}
                    >
                      {latestPeriodRange ? `Period · ${latestPeriodRange}` : 'No period logged'}
                    </AppText>
                    <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
                      {latestPeriod
                        ? `${latestPeriodDays} days · ${flowLabel(latestPeriod.flow_intensity)} flow`
                        : ''}
                    </AppText>
                  </View>
                </View>
              ) : (
                <CycleStrip
                  cycleDay={cycleDay}
                  cycleLength={effectiveCycleLength}
                  periodLength={effectivePeriodLength}
                  startDate={lastStart}
                  endDate={cycleEnd ?? lastStart}
                  parts={phaseParts}
                />
              )}
            </Panel>

            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: radius.group,
                  backgroundColor: 'rgba(255,107,90,0.14)',
                  padding: space.md,
                  gap: 1,
                }}
              >
                <AppText variant="footnote" tone="secondary">
                  Next period
                </AppText>
                <AppText
                  style={{
                    fontSize: 20,
                    lineHeight: 25,
                    fontFamily: fonts.bold,
                    color: colors.danger,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {late
                    ? 'Late'
                    : daysUntil === 0
                      ? 'Today'
                      : daysUntil !== null
                        ? `~${daysUntil} days`
                        : '—'}
                </AppText>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: radius.group,
                  backgroundColor: 'rgba(198,242,78,0.12)',
                  padding: space.md,
                  gap: 1,
                }}
              >
                <AppText variant="footnote" tone="secondary">
                  Fertile window
                </AppText>
                <AppText
                  style={{
                    fontSize: 20,
                    lineHeight: 25,
                    fontFamily: fonts.bold,
                    color: colors.primary,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fertileStart && fertileEnd ? compactRange(fertileStart, fertileEnd) : '—'}
                </AppText>
              </View>
            </View>
          </>
        ) : (
          <Panel style={{ gap: space.md, alignItems: 'center', paddingVertical: space.xxl }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="female" size={24} color={colors.primary} />
            </View>
            <AppText variant="headline">Start with your last period</AppText>
            <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
              Log the first day of your last period. Auxo will estimate your phase, fertile window
              and next cycle.
            </AppText>
            <Button label="Log last period" onPress={() => setCycleLogVisible(true)} />
          </Panel>
        )}

        <Panel style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <AppText style={{ flex: 1, fontSize: 20, lineHeight: 25, fontFamily: fonts.bold }}>
              Today
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              {todayLog ? 'Logged' : ''}
            </AppText>
          </View>

          {todayPills.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {todayPills.map((pill, index) => (
                <View
                  key={`${pill.label}-${index}`}
                  style={{
                    borderRadius: radius.pill,
                    backgroundColor: pill.background,
                    paddingHorizontal: space.md,
                    paddingVertical: 7,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      lineHeight: 17,
                      fontWeight: '600',
                      color: pill.color,
                    }}
                  >
                    {pill.label}
                  </AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="callout" tone="tertiary">
              Nothing logged yet.
            </AppText>
          )}

          <Button
            label={todayLog ? "Update today's check-in" : "Log today's check-in"}
            onPress={() => openLog(isoDate())}
          />
        </Panel>

        <Panel padded={false} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <StatCell value={`${stats.averageLength}d`} label="Avg cycle" />
          <View style={{ width: 1, height: 34, backgroundColor: colors.separator }} />
          <StatCell value={`${stats.averagePeriod}d`} label="Avg period" />
          <View style={{ width: 1, height: 34, backgroundColor: colors.separator }} />
          <StatCell value={String(stats.sampleSize)} label="Cycles tracked" />
        </Panel>

        <AppText
          variant="caption"
          tone="faint"
          style={{ textAlign: 'center', letterSpacing: 0.6, lineHeight: 17 }}
        >
          Estimates only. Dates can shift.
        </AppText>

        <View style={{ gap: space.sm }}>
          <SectionTitle title="History" right="Add" onRight={() => setCycleLogVisible(true)} />
          {cycles.length === 0 ? (
            <Panel>
              <AppText variant="body" tone="secondary">
                Log the first day of each period to build a clearer picture.
              </AppText>
            </Panel>
          ) : (
            <Panel padded={false} style={{ paddingHorizontal: space.xl }}>
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
                    onDelete={() =>
                      deleteRecord.mutate({ table: 'menstrual_cycles', id: cycle.id })
                    }
                  />
                );
              })}
            </Panel>
          )}
        </View>
      </View>

      <Sheet
        compact
        largeTitle
        visible={logVisible}
        title="Daily check-in"
        subtitle={formatLongDate(logDate)}
        badge={checkinBadge}
        badgeTone={phase?.key === 'menstrual' ? 'danger' : 'primary'}
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
          <FlowSegment value={flow} onChange={setFlow} />

          <View style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <AppText variant="caption" tone="secondary">
                Symptoms
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                {`${symptoms.length} selected`}
              </AppText>
            </View>
            <SymptomGrid values={symptoms} onToggle={toggleSymptom} />
          </View>

          <View style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <AppText variant="caption" tone="secondary">
                Mood
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                {`${moods.length} selected`}
              </AppText>
            </View>
            <MoodChoices values={moods} onToggle={toggleMood} />
          </View>

          <PainField value={pain} onChange={setPain} />

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

      <CycleSettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        cycleLength={effectiveCycleLength}
        periodLength={effectivePeriodLength}
        averageLength={stats.averageLength}
        averagePeriod={stats.averagePeriod}
        sampleSize={stats.sampleSize}
      />

      <CycleLogSheet
        visible={cycleLogVisible}
        onClose={() => setCycleLogVisible(false)}
        onSaved={(date) => setSelectedDate(date)}
      />
    </>
  );
};
