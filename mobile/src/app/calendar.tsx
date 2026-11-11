import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useCalendar, type CalendarDay } from '@/features/calendar/use-calendar';
import { formatLongDate, isoDate, startOfMonth } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const scoreColor = (score: number | null, colors: ReturnType<typeof useTheme>['colors']) => {
  if (score === null) return colors.surfaceAlt;
  if (score >= 75) return colors.success;
  if (score >= 50) return colors.amber;
  if (score > 0) return colors.primary;
  return colors.surfaceSunken;
};

const trinity = (day: CalendarDay | null) => {
  if (!day) return null;
  const values = [day.health, day.wealth, day.relations].filter((value): value is number => value !== null);
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
  const cells = useMemo(() => [...Array.from({ length: offset }, () => null), ...days], [days, offset]);
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
      safeAreaTop={false}
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => shiftMonth(-1)}
          hitSlop={10}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={18} color={colors.textSecondary} />
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
          <Icon name="chevron" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {WEEKDAYS.map((day, index) => (
            <AppText
              key={`${day}-${index}`}
              variant="mono"
              tone="tertiary"
              style={{ width: '13%', textAlign: 'center' }}
            >
              {day}
            </AppText>
          ))}
        </View>
        <View style={{ gap: space.sm }}>
          {weeks.map((week, weekIndex) => (
            <View
              key={`week-${weekIndex}`}
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <View key={`blank-${weekIndex}-${dayIndex}`} style={{ width: '13%', aspectRatio: 1 }} />;
                }
                const score = trinity(day);
                const active = day.date === selected;
                return (
                  <Pressable
                    key={day.date}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelected(day.date)}
                    style={({ pressed }) => ({
                      width: '13%',
                      aspectRatio: 1,
                      borderRadius: radius.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderWidth: !active && day.date === isoDate() ? 1 : 0,
                      borderColor: colors.primary,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <AppText
                      variant="footnote"
                      style={{ color: active ? colors.onPrimary : undefined }}
                      tone={active ? 'default' : score ? 'default' : 'tertiary'}
                    >
                      {Number(day.date.slice(-2))}
                    </AppText>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: active
                          ? colors.onPrimary
                          : scoreColor(score, colors),
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="Day detail" caption={formatLongDate(selected)} />
      <Card style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
          <RingMeter
            value={trinity(selectedDay) ?? 0}
            max={100}
            size={96}
            stroke={7}
            center={trinity(selectedDay) === null ? '—' : String(trinity(selectedDay))}
            label="Trinity"
          />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="headline">
              {trinity(selectedDay) === null ? 'No reading' : 'Day reading'}
            </AppText>
            <AppText variant="footnote" tone="secondary">
              {selectedDay?.completedGoals ?? 0} of {selectedDay?.totalGoals ?? 0} goals met
            </AppText>
          </View>
        </View>
        <StatRow>
          <Stat value={selectedDay?.health === null || !selectedDay ? '—' : String(selectedDay.health)} label="Health" />
          <Stat value={selectedDay?.wealth === null || !selectedDay ? '—' : String(selectedDay.wealth)} label="Wealth" />
          <Stat value={selectedDay?.relations === null || !selectedDay ? '—' : String(selectedDay.relations)} label="Relations" />
        </StatRow>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="callout">Goal completion</AppText>
            <AppText variant="footnote" tone="secondary">
              {selectedDay?.goals ?? 0}%
            </AppText>
          </View>
          <Progress value={selectedDay?.goals ?? 0} />
        </View>
      </Card>
    </Screen>
  );
}