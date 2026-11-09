import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
        <Button label="Prev" variant="secondary" size="small" onPress={() => shiftMonth(-1)} />
        <AppText variant="headline" style={{ flex: 1, textAlign: 'center' }}>
          {monthLabel}
        </AppText>
        <Button label="Next" variant="secondary" size="small" onPress={() => shiftMonth(1)} />
      </View>

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((day, index) => (
            <AppText key={`${day}-${index}`} variant="caption" tone="tertiary" style={{ flex: 1, textAlign: 'center' }}>
              {day}
            </AppText>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {cells.map((day, index) => {
            if (!day) return <View key={`blank-${index}`} style={{ width: '13.4%', aspectRatio: 1 }} />;
            const score = trinity(day);
            const active = day.date === selected;
            return (
              <Pressable
                key={day.date}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected(day.date)}
                style={({ pressed }) => ({
                  width: '13.4%',
                  aspectRatio: 1,
                  borderRadius: radius.small,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: scoreColor(score, colors),
                  borderWidth: active ? 2 : 0,
                  borderColor: colors.text,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <AppText variant="caption" style={{ color: score && score >= 50 ? '#FFFFFF' : colors.text }}>
                  {Number(day.date.slice(-2))}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Day detail" caption={formatLongDate(selected)} />
      <Card style={{ gap: space.lg }}>
        <StatRow>
          <Stat value={selectedDay?.health === null || !selectedDay ? '—' : String(selectedDay.health)} label="Health" tone="primary" />
          <Stat value={selectedDay?.wealth === null || !selectedDay ? '—' : String(selectedDay.wealth)} label="Wealth" />
          <Stat value={selectedDay?.relations === null || !selectedDay ? '—' : String(selectedDay.relations)} label="Relations" tone="success" />
        </StatRow>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="callout">Goal completion</AppText>
            <AppText variant="footnote" tone="secondary">
              {selectedDay?.goals ?? 0}%
            </AppText>
          </View>
          <Progress value={selectedDay?.goals ?? 0} color={colors.success} />
          <AppText variant="caption" tone="tertiary">
            {selectedDay?.completedGoals ?? 0} of {selectedDay?.totalGoals ?? 0} tracked goals completed.
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}