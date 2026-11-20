import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { DetailHeader } from '@/components/ui/detail-header';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useCalendar, type CalendarDay } from '@/features/calendar/use-calendar';
import { formatLongDate, isoDate, startOfMonth } from '@/lib/format';
import { space, useTheme } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const cellBackground = (
  score: number | null,
  active: boolean,
  colors: ReturnType<typeof useTheme>['colors'],
) => {
  if (active) return colors.primary;
  if (score === null || score <= 0) return 'transparent';
  if (score >= 70) return 'rgba(198,242,78,0.16)';
  if (score >= 50) return 'rgba(255,176,32,0.18)';
  return 'rgba(255,107,90,0.15)';
};

const readingColor = (
  score: number | null,
  colors: ReturnType<typeof useTheme>['colors'],
) => {
  if (score === null) return colors.text;
  if (score >= 70) return colors.primary;
  if (score >= 50) return colors.amber;
  return colors.danger;
};

const trinity = (day: CalendarDay | null) => {
  if (!day) return null;
  if (day.total !== null) return day.total;
  const values = [day.health, day.wealth, day.relations].filter(
    (value): value is number => value !== null,
  );
  if (!values.length) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};

export default function CalendarScreen() {
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => startOfMonth());
  const [selected, setSelected] = useState(() => isoDate());
  const { data, isPending, isError, error, refetch, isRefetching } = useCalendar(month);

  const days = useMemo(() => data ?? [], [data]);
  const selectedDay = days.find((day) => day.date === selected) ?? null;
  const offset = startOfMonth(month).getDay();
  const cells = useMemo(
    () => [...Array.from({ length: offset }, () => null), ...days],
    [days, offset],
  );
  const weeks = useMemo(() => {
    const rows: (CalendarDay | null)[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      const row = cells.slice(index, index + 7);
      while (row.length < 7) row.push(null);
      rows.push(row);
    }
    return rows;
  }, [cells]);
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) => {
    const next = new Date(month);
    next.setMonth(next.getMonth() + delta);
    setMonth(startOfMonth(next));
    setSelected(isoDate(startOfMonth(next)));
  };

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
      <DetailHeader title="Progress calendar" fallback="/(tabs)/health" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => shiftMonth(-1)}
          hitSlop={10}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={20} color={colors.textSecondary} />
        </Pressable>
        <AppText variant="headline" style={{ flex: 1, textAlign: 'center' }}>
          {monthLabel}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => shiftMonth(1)}
          hitSlop={10}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      <Panel style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {WEEKDAYS.map((day, index) => (
            <AppText
              key={`${day}-${index}`}
              variant="mono"
              tone="tertiary"
              style={{ flex: 1, textAlign: 'center' }}
            >
              {day}
            </AppText>
          ))}
        </View>
        <View style={{ gap: 6 }}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={{ flexDirection: 'row', gap: 6 }}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return (
                    <View
                      key={`blank-${weekIndex}-${dayIndex}`}
                      style={{ flex: 1, aspectRatio: 1 }}
                    />
                  );
                }
                const score = trinity(day);
                const active = day.date === selected;
                return (
                  <Pressable
                    key={day.date}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatLongDate(day.date)}: ${
                      score === null ? 'no reading' : `${score} out of 100`
                    }`}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelected(day.date)}
                    style={({ pressed }) => ({
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: cellBackground(score, active, colors),
                      opacity: pressed ? 0.65 : 1,
                    })}
                  >
                    <AppText
                      variant="footnote"
                      style={{
                        fontFamily: active ? 'Baloo2_700Bold' : undefined,
                        color: active
                          ? colors.onPrimary
                          : score === null
                            ? colors.textFaint
                            : colors.text,
                      }}
                    >
                      {Number(day.date.slice(-2))}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: space.xl,
            borderTopWidth: 1,
            borderTopColor: colors.separator,
            paddingTop: space.md,
          }}
        >
          {[
            { color: colors.primary, label: '70+' },
            { color: colors.amber, label: '50–74' },
            { color: colors.danger, label: 'UNDER 50' },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
              <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.4 }}>
                {item.label}
              </AppText>
            </View>
          ))}
        </View>
      </Panel>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: space.md,
        }}
      >
        <AppText variant="headline" style={{ fontSize: 24, lineHeight: 28 }}>
          Day detail
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          {formatLongDate(selected)}
        </AppText>
      </View>

      <Panel style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
          <RingMeter
            value={trinity(selectedDay) ?? 0}
            max={100}
            size={96}
            stroke={7}
            color={readingColor(trinity(selectedDay), colors)}
            center={trinity(selectedDay) === null ? '—' : String(trinity(selectedDay))}
            centerSize={26}
            label="AUXO"
          />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="headline" style={{ fontSize: 24, lineHeight: 28 }}>
              {trinity(selectedDay) === null ? 'No reading' : 'Day reading'}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                }}
              />
              <AppText variant="footnote" tone="secondary">
                {selectedDay?.completedGoals ?? 0} of {selectedDay?.totalGoals ?? 0} goals met
              </AppText>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.lg }}>
          {[
            { key: 'health' as const, label: 'Health', color: colors.primary },
            { key: 'wealth' as const, label: 'Wealth', color: colors.amber },
            { key: 'relations' as const, label: 'People', color: colors.bonds },
          ].map((pillar) => {
            const value = selectedDay?.[pillar.key] ?? null;
            return (
              <View key={pillar.key} style={{ flex: 1, gap: 6 }}>
                <AppText
                  variant="numeric"
                  style={{
                    color: value === null ? colors.textTertiary : pillar.color,
                    fontSize: 24,
                    lineHeight: 28,
                  }}
                >
                  {value === null ? '—' : value}
                </AppText>
                <Progress value={value ?? 0} color={pillar.color} height={6} />
                <AppText variant="footnote" tone="secondary">
                  {pillar.label}
                </AppText>
              </View>
            );
          })}
        </View>

        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="callout">Goal completion</AppText>
            <AppText variant="callout" tone="primary" style={{ fontWeight: '700' }}>
              {selectedDay?.goals ?? 0}%
            </AppText>
          </View>
          <Progress value={selectedDay?.goals ?? 0} height={8} />
        </View>
      </Panel>
    </Screen>
  );
}
