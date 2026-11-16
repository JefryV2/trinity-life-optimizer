import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useGpsWalk } from '@/features/health/use-gps-walk';
import { RouteMap } from '@/features/health/components/route-map';
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

export default function Walk() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const walk = useGpsWalk();

  const displaySteps = walk.saved ? walk.todaySteps : walk.todaySteps + walk.steps;
  const percent = Math.min(100, Math.round((displaySteps / GOAL_STEPS) * 100));
  const remaining = Math.max(0, GOAL_STEPS - displaySteps);
  const distanceKm = (walk.distanceM / 1000).toFixed(2);
  const cadence =
    walk.durationS >= 30 && walk.steps > 0
      ? Math.round(walk.steps / (walk.durationS / 60))
      : 0;

  const status = {
    idle: { label: 'Ready', color: colors.textTertiary },
    tracking: { label: 'Recording', color: colors.primary },
    paused: { label: 'Paused', color: colors.amber },
    finished: { label: 'Finished', color: colors.success },
  }[walk.status];

  const gps = walk.accuracy
    ? `±${Math.round(walk.accuracy)} m`
    : walk.status === 'tracking'
      ? 'Locating'
      : 'GPS off';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.lg,
          paddingBottom: space.xxl,
          gap: space.lg,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <View style={{ gap: space.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: status.color,
                }}
              />
              <AppText
                variant="caption"
                tone="secondary"
                accessibilityLiveRegion="polite"
                style={{ letterSpacing: 1.2 }}
              >
                {status.label}
              </AppText>
            </View>
            <AppText variant="mono" tone="tertiary">
              {gps}
            </AppText>
          </View>

          <RouteMap segments={walk.route} height={240} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: space.lg }}>
          <View style={{ flex: 1.15, gap: 2 }}>
            <AppText variant="caption" tone="tertiary">
              Distance
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <AppText
                variant="numeric"
                style={{ fontSize: 50, lineHeight: 52, fontVariant: ['tabular-nums'] }}
              >
                {distanceKm}
              </AppText>
              <AppText variant="callout" tone="secondary">
                km
              </AppText>
            </View>
          </View>

          <View style={{ width: 1, backgroundColor: colors.separator }} />

          <View style={{ flex: 1, gap: space.sm, justifyContent: 'center' }}>
            <View style={{ gap: 1 }}>
              <AppText variant="caption" tone="tertiary">
                Time
              </AppText>
              <AppText
                variant="numeric"
                style={{ fontSize: 24, lineHeight: 26, fontVariant: ['tabular-nums'] }}
              >
                {formatDuration(walk.durationS)}
              </AppText>
            </View>
            <View style={{ gap: 1 }}>
              <AppText variant="caption" tone="tertiary">
                Pace
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                <AppText
                  variant="numeric"
                  style={{ fontSize: 24, lineHeight: 26, fontVariant: ['tabular-nums'] }}
                >
                  {formatPace(walk.paceSPerKm)}
                </AppText>
                <AppText variant="caption" tone="tertiary">
                  /km
                </AppText>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.lg,
            borderTopWidth: 1,
            borderTopColor: colors.separator,
            paddingTop: space.md,
          }}
        >
          <RingMeter
            value={displaySteps}
            max={GOAL_STEPS}
            size={76}
            stroke={7}
            center={`${percent}%`}
            centerSize={16}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <AppText
                variant="headline"
                style={{ fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}
              >
                {formatNumber(displaySteps)}
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                steps today
              </AppText>
            </View>
            <AppText variant="footnote" tone="tertiary">
              {walk.steps > 0
                ? `+${formatNumber(walk.steps)} this walk${
                    remaining > 0 ? ` · ${formatNumber(remaining)} to goal` : ' · goal reached'
                  }`
                : `${formatNumber(GOAL_STEPS)} daily goal`}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space.md }}>
            {walk.calories > 0 ? (
              <AppText variant="footnote" tone="tertiary">
                ≈ {formatNumber(walk.calories)} kcal
              </AppText>
            ) : null}
            {cadence > 0 ? (
              <AppText variant="footnote" tone="tertiary">
                {cadence} spm
              </AppText>
            ) : null}
          </View>
          {walk.status === 'tracking' ? (
            <AppText variant="footnote" tone="tertiary">
              {walk.backgroundGranted
                ? 'Tracking continues in the background.'
                : 'Keep Auxo open while you walk.'}
            </AppText>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.separator,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 720,
            alignSelf: 'center',
            paddingHorizontal: space.xl,
            paddingTop: space.md,
            paddingBottom: Math.max(space.md, insets.bottom),
            gap: space.sm,
          }}
        >
          {walk.status === 'tracking' && !walk.backgroundGranted ? (
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => void Linking.openSettings()}
              style={{ minHeight: 24, justifyContent: 'center' }}
            >
              <AppText variant="footnote" tone="tertiary">
                Background off · Allow “all the time” in Settings
              </AppText>
            </Pressable>
          ) : null}

          {walk.error ? (
            <AppText variant="footnote" tone="danger">
              {walk.error}
            </AppText>
          ) : null}

          {walk.saved ? (
            <AppText variant="footnote" tone="success">
              Walk saved to today’s activity.
            </AppText>
          ) : null}

          {walk.status === 'idle' ? (
            <Button label="Start walk" loading={walk.busy} onPress={() => void walk.start()} />
          ) : null}

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
                <Button label="Resume" loading={walk.busy} onPress={() => void walk.resume()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Finish" variant="secondary" onPress={walk.finish} />
              </View>
            </View>
          ) : null}

          {walk.status === 'finished' ? (
            walk.saved ? (
              <Button label="Done" onPress={() => { void walk.reset(); router.back(); }} />
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
                  <Button label="Discard" variant="secondary" onPress={walk.reset} />
                </View>
              </View>
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}
