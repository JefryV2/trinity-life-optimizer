import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DetailHeader } from '@/components/ui/detail-header';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { RouteMap } from '@/features/health/components/route-map';
import { useHealth } from '@/features/health/use-health';
import { haversine } from '@/features/health/walk-session';
import { formatDate, formatNumber } from '@/lib/format';
import { openEdit } from '@/lib/navigation';
import { fonts, space, useTheme } from '@/theme';

const Stat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <AppText variant="caption" tone="tertiary">
      {label}
    </AppText>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <AppText
        variant="numeric"
        style={{ fontSize: 26, lineHeight: 30, letterSpacing: -1, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </AppText>
      {unit ? (
        <AppText variant="footnote" tone="secondary">
          {unit}
        </AppText>
      ) : null}
    </View>
  </View>
);

const formatPace = (minutesPerKm: number) => {
  if (!minutesPerKm || !Number.isFinite(minutesPerKm)) return '—';
  let minutes = Math.floor(minutesPerKm);
  let seconds = Math.round((minutesPerKm - minutes) * 60);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function WalkDetail() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, isPending, isError, error, refetch } = useHealth();
  const record = data?.exercise.find((entry) => entry.id === id);
  const route = (record?.route ?? []).filter((segment) => segment.length > 1);
  const hasRoute = route.length > 0;

  const routeDistanceM = (record?.route ?? []).reduce(
    (total, segment) =>
      total +
      segment.slice(1).reduce((sum, point, index) => sum + haversine(segment[index], point), 0),
    0,
  );
  const notes = record?.notes ?? '';
  const noteKm = Number(notes.match(/([\d.]+)\s*km/i)?.[1] ?? 0);
  const noteSteps = Number(notes.match(/([\d,]+)\s*steps/i)?.[1]?.replace(/,/g, '') ?? 0);
  const km = routeDistanceM > 1 ? routeDistanceM / 1000 : noteKm;
  const steps = noteSteps || (routeDistanceM > 1 ? Math.round(routeDistanceM / 0.72) : 0);
  const minutes = record?.duration_minutes ?? 0;
  const pace = km > 0 && minutes > 0 ? minutes / km : 0;

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.xxl, gap: space.lg }}
    >
      <DetailHeader title="Walk route" fallback="/(tabs)/health" />

      {isPending ? <LoadingState rows={3} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {!isPending && !isError && !record ? (
        <View style={{ gap: space.md, paddingTop: space.xxl }}>
          <AppText variant="headline">Walk not found</AppText>
          <AppText variant="footnote" tone="secondary">
            This workout is no longer in your recent history.
          </AppText>
          <Button label="Back to activity" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}

      {record ? (
        <>
          <RouteMap segments={route} height={300} />

          <View style={{ gap: 2 }}>
            <AppText
              style={{ fontSize: 30, lineHeight: 36, fontFamily: fonts.black, letterSpacing: -1.1 }}
            >
              {record.exercise_name}
            </AppText>
            <AppText variant="footnote" tone="secondary">
              {[
                record.completed_at ? formatDate(record.completed_at) : 'Recent',
                record.intensity ?? 'moderate',
                record.calories_burned ? `${record.calories_burned} kcal` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </View>

          <Panel style={{ gap: space.lg }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Stat label="Distance" value={km > 0 ? km.toFixed(2) : '—'} unit={km > 0 ? 'km' : undefined} />
              <Stat label="Time" value={String(minutes)} unit="min" />
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Stat label="Steps" value={steps > 0 ? formatNumber(steps) : '—'} />
              <Stat label="Pace" value={pace > 0 ? formatPace(pace) : '—'} unit={pace > 0 ? '/km' : undefined} />
            </View>
          </Panel>

          {!hasRoute ? (
            <AppText variant="footnote" tone="tertiary">
              No GPS route was saved for this workout.
            </AppText>
          ) : null}

          <Button
            label="Edit workout"
            variant="secondary"
            onPress={() => openEdit('exercise', record.id)}
          />
        </>
      ) : null}
    </Screen>
  );
}
