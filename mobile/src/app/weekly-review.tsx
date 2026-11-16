import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { addDays, formatStamp, isoDate, startOfDay } from '@/lib/format';
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

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <BackLink />
      <PageHeader
        title="This week"
        date={`${formatStamp(weekStart)} – ${formatStamp(today)}`}
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
              7-DAY AVERAGE
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
              {current.length} of 7 days with a reading. {previous.length > 0 ? 'Compared with the previous 7 days.' : 'The next week gives this a baseline.'}
            </AppText>
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
          <AppText variant="callout">Pick one lever for the next seven days.</AppText>
          <AppText variant="footnote" tone="secondary">
            The experiment compares the days you meet the rule with the days you miss it.
          </AppText>
          <Button
            label="Open experiments"
            variant="secondary"
            onPress={() => router.push('/experiments' as never)}
          />
        </Card>
      </View>
    </Screen>
  );
}
