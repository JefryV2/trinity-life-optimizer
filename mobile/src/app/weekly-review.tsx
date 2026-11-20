import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { addDays, formatDate, isoDate, startOfDay } from '@/lib/format';
import { PILLAR_COLOR } from '@/lib/score-labels';
import { trackOnce } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { radius, space, useTheme } from '@/theme';

interface Snapshot {
  date: string;
  total: number;
  health: number;
  wealth: number;
  bonds: number;
}

const PILLARS = [
  { key: 'health' as const, label: 'Health', color: PILLAR_COLOR.health },
  { key: 'wealth' as const, label: 'Wealth', color: PILLAR_COLOR.wealth },
  { key: 'bonds' as const, label: 'People', color: PILLAR_COLOR.bonds },
];

const average = (rows: Snapshot[], key: keyof Omit<Snapshot, 'date'>): number | null => {
  if (rows.length === 0) return null;
  return Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length);
};

const delta = (current: number | null, previous: number | null): number | null =>
  current === null || previous === null ? null : current - previous;

const WeekStrip = ({ days }: { days: Array<{ date: string; total: number | null }> }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingTop: space.xs }}>
      {days.map((day) => {
        const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'narrow',
        });
        const height = day.total === null ? 4 : Math.max(8, (Math.min(100, day.total) / 100) * 60);
        return (
          <View
            key={day.date}
            accessible
            accessibilityLabel={`${label}: ${day.total === null ? 'not logged' : `${day.total} out of 100`}`}
            style={{ flex: 1, alignItems: 'center', gap: 6 }}
          >
            <View
              style={{
                width: '100%',
                height: 60,
                justifyContent: 'flex-end',
                backgroundColor: colors.surfaceSunken,
                borderRadius: radius.segment,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height,
                  backgroundColor: day.total === null ? 'transparent' : colors.primary,
                  borderRadius: radius.segment,
                }}
              />
            </View>
            <AppText variant="caption" tone={day.total === null ? 'tertiary' : 'secondary'}>
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
};

export default function WeeklyReview() {
  const { colors } = useTheme();
  const { user } = useAuth();
  useEffect(() => {
    void trackOnce('weekly_review_opened');
  }, []);
  const today = startOfDay();
  const weekStart = addDays(today, -6);
  const previousStart = addDays(today, -13);
  const previousEnd = addDays(today, -7);

  const query = useQuery({
    queryKey: ['weekly-review', user?.id, isoDate(today)],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from('score_snapshots')
        .select('date,total,health,wealth,bonds')
        .eq('user_id', user!.id)
        .gte('date', isoDate(previousStart))
        .lte('date', isoDate(today))
        .order('date', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Snapshot[];
    },
  });

  const rows = query.data ?? [];
  const current = rows.filter(
    (row) => row.date >= isoDate(weekStart) && row.date <= isoDate(today),
  );
  const previous = rows.filter(
    (row) => row.date >= isoDate(previousStart) && row.date <= isoDate(previousEnd),
  );
  const currentTotal = average(current, 'total');
  const previousTotal = average(previous, 'total');
  const totalDelta = delta(currentTotal, previousTotal);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = isoDate(addDays(weekStart, index));
    const row = current.find((item) => item.date === date);
    return { date, total: row?.total ?? null };
  });

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <PageHeader back="/(tabs)/more"
        title="This week"
        date={`${formatDate(weekStart)} – ${formatDate(today)}`}
      />

      {query.isPending ? <LoadingState rows={4} /> : null}
      {query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : null}

      {!query.isPending && !query.isError && (current.length === 0 || currentTotal === 0) ? (
        <Card style={{ gap: space.md }}>
          <AppText variant="headline">No readings yet.</AppText>
          <AppText variant="footnote" tone="secondary">
            Log one thing on Today. Your first weekly review appears once there is a day to
            compare.
          </AppText>
          <Button label="Open Today" onPress={() => router.replace('/(tabs)' as never)} />
        </Card>
      ) : null}

      {current.length > 0 ? (
        <>
          <Card raised style={{ gap: space.md }}>
            <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
              {`${current.length}-DAY AVERAGE`}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
              <AppText variant="display" selectable>
                {currentTotal ?? 0}
              </AppText>
              {totalDelta !== null ? (
                <AppText
                  variant="callout"
                  tone={totalDelta > 0 ? 'success' : totalDelta < 0 ? 'danger' : 'tertiary'}
                >
                  {totalDelta > 0 ? '+' : ''}
                  {totalDelta} vs last week
                </AppText>
              ) : (
                <AppText variant="callout" tone="tertiary">
                  first week
                </AppText>
              )}
            </View>
            <AppText variant="footnote" tone="secondary">
              {`${current.length} of 7 days logged.${previous.length > 0 ? ' Compared with the previous week.' : ''}`}
            </AppText>
            <WeekStrip days={weekDays} />
          </Card>

          <View style={{ gap: space.md }}>
            <SectionHeader index="01" title="Pillars" />
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              {PILLARS.map((pillar, index) => {
                const currentValue = average(current, pillar.key);
                const previousValue = average(previous, pillar.key);
                const change = delta(currentValue, previousValue);
                return (
                  <View
                    key={pillar.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingVertical: space.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.separator,
                    }}
                  >
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: radius.pill,
                        backgroundColor: pillar.color,
                      }}
                    />
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {pillar.label}
                    </AppText>
                    <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                      {currentValue ?? '—'}
                    </AppText>
                    <AppText
                      variant="footnote"
                      tone={change === null ? 'tertiary' : change > 0 ? 'success' : change < 0 ? 'danger' : 'tertiary'}
                      style={{ minWidth: 54, textAlign: 'right', fontVariant: ['tabular-nums'] }}
                    >
                      {change === null ? '—' : `${change > 0 ? '+' : ''}${change}`}
                    </AppText>
                  </View>
                );
              })}
            </Card>
          </View>
        </>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader index="02" title="Next week" />
        <Card style={{ gap: space.md }}>
          <AppText variant="callout">Pick one next step for the next seven days.</AppText>
          <AppText variant="footnote" tone="secondary">
            The experiment compares the days you meet the rule with the days you miss it.
          </AppText>
          <Button
            label="Choose a next step"
            onPress={() => router.push('/experiments' as never)}
          />
        </Card>
      </View>
    </Screen>
  );
}
