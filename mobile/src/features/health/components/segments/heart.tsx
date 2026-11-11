import { useWindowDimensions, View } from 'react-native';

import { Sparkline } from '@/components/charts/sparkline';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useHeart } from '@/features/heart/use-heart';
import { useHeartRate } from '@/features/heart/use-heart-rate';
import { openAdd } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

export const HeartSegment = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { data, isPending, isError, error, refetch } = useHeart();
  const ble = useHeartRate();

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const { stats, readings } = data;

  return (
    <>
      <Card raised style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <AppText variant="numeric" style={{ color: colors.primary }}>
            {ble.status === 'connected' && ble.bpm !== null ? ble.bpm : stats.latest ?? '—'}
          </AppText>
          <AppText variant="callout" tone="secondary">
            {ble.status === 'connected' ? 'bpm · live' : 'bpm · latest reading'}
          </AppText>
        </View>
        <StatRow>
          <Stat value={stats.resting !== null ? String(stats.resting) : '—'} label="Resting avg" />
          <Stat value={stats.count > 0 ? String(stats.average) : '—'} label="7-day avg" />
          <Stat value={stats.count > 0 ? `${stats.min}–${stats.max}` : '—'} label="Range" />
        </StatRow>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button label="Log a reading" variant="secondary" onPress={() => openAdd('heart-manual')} />
          </View>
          <View style={{ flex: 1 }}>
            {ble.status === 'scanning' || ble.status === 'connecting' || ble.status === 'connected' ? (
              <Button
                label={ble.status === 'connected' ? 'Disconnect' : 'Cancel'}
                variant="secondary"
                onPress={ble.stop}
              />
            ) : (
              <Button label="Connect monitor" onPress={() => void ble.start()} />
            )}
          </View>
        </View>
        {ble.status === 'scanning' || ble.status === 'connecting' ? (
          <AppText variant="footnote" tone="secondary">
            {ble.status === 'scanning' ? 'Scanning for a heart-rate monitor…' : 'Connecting…'}
          </AppText>
        ) : null}
        {ble.message ? (
          <AppText variant="footnote" tone={ble.status === 'error' ? 'danger' : 'secondary'}>
            {ble.message}
          </AppText>
        ) : null}
      </Card>

      {readings.length > 1 ? (
        <Card style={{ gap: space.md }}>
          <SectionHeader title="Trend" caption="Recent readings" />
          <Sparkline
            values={readings
              .slice(0, 7)
              .reverse()
              .map((reading) => reading.heart_rate)}
            width={Math.min(720, width) - 80}
            height={64}
            color={colors.primary}
          />
        </Card>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Recent readings" caption="Last 7 days" />
        {readings.length === 0 ? (
          <EmptyState
            icon="heart"
            title="No heart-rate data"
            message="Log a manual pulse check, or connect a Bluetooth monitor once the device build is installed."
            actionLabel="Log manually"
            onAction={() => openAdd('heart-manual')}
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: space.xl }}>
            {readings.slice(0, 12).map((reading, index) => (
              <ListRow
                key={reading.id}
                icon="heart"
                title={`${reading.heart_rate} bpm`}
                subtitle={`${new Date(reading.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })} · ${reading.activity_type ?? 'unknown'}`}
                value={reading.source_device === 'manual' ? 'Manual' : reading.source_device ?? 'Device'}
                last={index === Math.min(readings.length, 12) - 1}
              />
            ))}
          </Card>
        )}
      </View>
    </>
  );
};