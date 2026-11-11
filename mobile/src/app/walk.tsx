import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useGpsWalk } from '@/features/health/use-gps-walk';
import { formatNumber } from '@/lib/format';
import { space, useTheme } from '@/theme';

const GOAL_STEPS = 10_000;

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatPace = (secondsPerKm: number) => {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '—';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const Metric = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.6 }}>
      {label}
    </AppText>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <AppText variant="numeric" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      {unit ? (
        <AppText variant="caption" tone="tertiary">
          {unit}
        </AppText>
      ) : null}
    </View>
  </View>
);

export default function Walk() {
  const { colors } = useTheme();
  const router = useRouter();
  const walk = useGpsWalk();

  const displaySteps = walk.saved ? walk.todaySteps : walk.todaySteps + walk.steps;
  const running = walk.status === 'tracking' || walk.status === 'paused';

  return (
    <Screen safeAreaTop={false}>
      <SectionHeader
        index="01"
        title="GPS walk"
        caption="Steps estimated from distance and your height"
      />

      <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.md }}>
        <RingMeter
          value={Math.min(displaySteps, GOAL_STEPS)}
          max={GOAL_STEPS}
          size={220}
          stroke={14}
          centerSize={46}
          center={formatNumber(displaySteps)}
          label="steps today"
        />
        <AppText variant="caption" tone="tertiary">
          {walk.steps > 0
            ? `+${formatNumber(walk.steps)} this walk`
            : `${formatNumber(GOAL_STEPS)} daily target`}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <Metric label="DISTANCE" value={(walk.distanceM / 1000).toFixed(2)} unit="km" />
        <Metric label="TIME" value={formatDuration(walk.durationS)} />
        <Metric label="PACE" value={formatPace(walk.paceSPerKm)} unit="/km" />
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.separator,
          paddingTop: space.md,
          gap: 4,
        }}
      >
        <AppText variant="footnote" tone="secondary">
          {walk.accuracy
            ? `GPS accuracy ±${Math.round(walk.accuracy)} m`
            : running
              ? 'Waiting for a GPS fix…'
              : 'GPS is off until you start.'}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Steps come from distance, not the motion sensor. Keep Trinity open while you walk; a
          weak signal under trees or between buildings makes the estimate less accurate.
        </AppText>
        {walk.calories > 0 ? (
          <AppText variant="caption" tone="tertiary">
            ≈ {formatNumber(walk.calories)} kcal · stride {walk.strideM.toFixed(2)} m
          </AppText>
        ) : null}
      </View>

      {walk.error ? (
        <AppText variant="footnote" tone="danger">
          {walk.error}
        </AppText>
      ) : null}

      {walk.saved ? (
        <AppText variant="footnote" tone="success">
          Walk saved to today, with the workout in your fitness log.
        </AppText>
      ) : null}

      {walk.status === 'idle' ? <Button label="Start walk" onPress={() => void walk.start()} /> : null}

      {walk.status === 'tracking' ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button label="Pause" variant="secondary" onPress={walk.pause} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Finish" onPress={walk.finish} />
          </View>
        </View>
      ) : null}

      {walk.status === 'paused' ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button label="Resume" onPress={() => void walk.resume()} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Finish" variant="secondary" onPress={walk.finish} />
          </View>
        </View>
      ) : null}

      {walk.status === 'finished' ? (
        walk.saved ? (
          <Button label="Done" onPress={() => router.back()} />
        ) : (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Save walk"
                loading={walk.saving}
                onPress={() => void walk.save()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Discard" variant="ghost" onPress={walk.reset} />
            </View>
          </View>
        )
      ) : null}
    </Screen>
  );
}
