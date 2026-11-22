import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
} from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useHeart, type HeartReading } from '@/features/heart/use-heart';
import { useHeartRate } from '@/features/heart/use-heart-rate';

const formatReadingTime = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
import { fonts, radius, space, useTheme } from '@/theme';

const CONTEXTS = [
  { value: 'resting', label: 'Resting', caption: 'At rest' },
  { value: 'active', label: 'Active', caption: 'Moving' },
  { value: 'recovery', label: 'Recovery', caption: 'After effort' },
];

const PULSE_PATH = 'M2 27h19l6-17 8 34 8-25 7 12h25';

const PulseMark = () => (
  <Svg width={100} height={50} viewBox="0 0 100 50">
    <Path
      d={PULSE_PATH}
      stroke="#C6F24E"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const StatTile = ({ value, label }: { value: string; label: string }) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minHeight: 118,
        borderRadius: radius.group,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.045)',
        paddingHorizontal: 14,
        paddingVertical: 14,
        justifyContent: 'space-between',
      }}
    >
      <AppText
        style={{
          color: colors.text,
          fontFamily: fonts.black,
          fontSize: 30,
          lineHeight: 32,
          letterSpacing: -1.3,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      <AppText variant="footnote" tone="secondary" numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
};

const Trend = ({ readings, width }: { readings: HeartReading[]; width: number }) => {
  const { colors } = useTheme();
  const values = readings
    .slice(0, 7)
    .map((reading) => reading.heart_rate)
    .reverse();
  const chartWidth = Math.max(160, width - 64);
  const height = 96;
  const pad = 8;

  if (values.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="footnote" tone="tertiary">
          Two readings will draw the trend.
        </AppText>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (chartWidth - pad * 2) / (values.length - 1);
  const points = values.map((value, index) => ({
    x: pad + index * step,
    y: height - 16 - ((value - min) / span) * (height - 28),
  }));
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${height - 1} L ${points[0].x.toFixed(1)} ${height - 1} Z`;
  const last = points[points.length - 1];

  return (
    <Svg width={chartWidth} height={height}>
      <Defs>
        <LinearGradient id="heart-area" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C6F24E" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#C6F24E" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {[0.28, 0.52, 0.76].map((fraction) => (
        <Line
          key={fraction}
          x1={0}
          x2={chartWidth}
          y1={height * fraction}
          y2={height * fraction}
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={1}
          strokeDasharray="3 5"
        />
      ))}
      <Path d={area} fill="url(#heart-area)" />
      <Path
        d={line}
        stroke={colors.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {points.map((point, index) => (
        <Circle
          key={`${point.x}-${index}`}
          cx={point.x}
          cy={point.y}
          r={2.4}
          fill={colors.background}
          stroke={colors.primary}
          strokeWidth={1.6}
        />
      ))}
      <Circle cx={last.x} cy={last.y} r={4.5} fill={colors.primary} />
    </Svg>
  );
};

const activityLabel = (value: string | null) => {
  if (value === 'live') return 'Live';
  if (value === 'walking') return 'Walking';
  if (value === 'active') return 'Active';
  if (value === 'recovery') return 'Recovery';
  return 'Resting';
};

const activityColor = (value: string | null, colors: ReturnType<typeof useTheme>['colors']) => {
  if (value === 'live') return colors.primary;
  if (value === 'walking' || value === 'active') return colors.amber;
  if (value === 'recovery') return colors.bonds;
  return colors.bonds;
};

const HeartManualSheet = ({
  visible,
  onClose,
  initialBpm,
}: {
  visible: boolean;
  onClose: () => void;
  initialBpm: number;
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { addManual } = useHeart();
  const [bpm, setBpm] = useState(initialBpm);
  const [activity, setActivity] = useState('resting');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ring = Math.min(208, Math.max(176, width - 172));
  const center = ring / 2;
  const stroke = 13;
  const radiusValue = center - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radiusValue;
  const progress = Math.max(0, Math.min(1, (bpm - 30) / 200));

  const adjust = (delta: number) => {
    setBpm((current) => Math.max(30, Math.min(230, current + delta)));
    setError(null);
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await addManual.mutateAsync({ bpm, activity });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this reading.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      headerless
      background={colors.background}
      visible={visible}
      title="Log heart rate"
      onClose={onClose}
      contentStyle={{ flexGrow: 1 }}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onClose}
            style={({ pressed }) => ({
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="back" size={22} color={colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Button label="Save reading" loading={saving} onPress={() => void save()} />
          </View>
        </View>
      }
    >
      <View style={{ flexGrow: 1, justifyContent: 'space-between', gap: space.lg }}>
        <View style={{ gap: space.lg }}>
        <View style={{ gap: 4 }}>
          <AppText variant="caption" tone="primary" style={{ letterSpacing: 1.2 }}>
            LOG
          </AppText>
          <AppText
            style={{
              color: colors.text,
              fontFamily: fonts.black,
              fontSize: 48,
              lineHeight: 49,
              letterSpacing: -2,
            }}
          >
            Log heart rate
          </AppText>
          <AppText variant="body" tone="secondary">
            Manual pulse check
          </AppText>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: space.sm,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease heart rate"
            onPress={() => adjust(-1)}
            style={({ pressed }) => ({
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 28 }}>−</AppText>
          </Pressable>

          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Heart rate"
            accessibilityValue={{ min: 30, max: 230, now: bpm }}
            onPress={() => adjust(1)}
            style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={ring} height={ring} style={{ position: 'absolute' }}>
              <Circle
                cx={center}
                cy={center}
                r={radiusValue}
                stroke={colors.surfaceSunken}
                strokeWidth={stroke}
                fill="none"
              />
              <Circle
                cx={center}
                cy={center}
                r={radiusValue}
                stroke={colors.primary}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
                rotation={-90}
                origin={`${center}, ${center}`}
              />
            </Svg>
            <AppText
              style={{
                color: colors.primary,
                fontFamily: fonts.black,
                fontSize: 76,
                lineHeight: 76,
                letterSpacing: -4,
              }}
            >
              {bpm}
            </AppText>
            <AppText variant="body" tone="secondary" style={{ marginTop: -3 }}>
              bpm
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase heart rate"
            onPress={() => adjust(1)}
            style={({ pressed }) => ({
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <AppText style={{ color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 28 }}>+</AppText>
          </Pressable>
        </View>

        <AppText variant="footnote" tone="tertiary" style={{ textAlign: 'center' }}>
          Tap the ring with each beat, or use − and +
        </AppText>

        </View>

        <View style={{ gap: space.sm }}>
          <AppText variant="caption" tone="secondary">
            Context
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CONTEXTS.map((option) => {
              const selected = activity === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setActivity(option.value)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 82,
                    borderRadius: radius.group,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <AppText
                    style={{
                      color: selected ? colors.onPrimary : colors.text,
                      fontFamily: fonts.bold,
                      fontSize: 14,
                    }}
                  >
                    {option.label}
                  </AppText>
                  <AppText
                    style={{
                      color: selected ? 'rgba(7,7,8,0.62)' : colors.textTertiary,
                      fontFamily: fonts.regular,
                      fontSize: 12,
                    }}
                  >
                    {option.caption}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <AppText variant="footnote" tone="danger">
            {error}
          </AppText>
        ) : null}
      </View>
    </Sheet>
  );
};

export const HeartSegment = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { data, isPending, isError, error, refetch } = useHeart();
  const ble = useHeartRate();
  const [manualVisible, setManualVisible] = useState(false);

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const { stats, readings } = data;
  const latest = ble.status === 'connected' && ble.bpm !== null ? ble.bpm : stats.latest;

  return (
    <>
      <View style={{ gap: space.lg }}>
        <View>
          <AppText variant="caption" tone="tertiary">
            Heart rate
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText
              style={{
                color: colors.primary,
                fontFamily: fonts.black,
                fontSize: 100,
                lineHeight: 96,
                letterSpacing: -6,
              }}
            >
              {latest ?? '—'}
            </AppText>
            <PulseMark />
          </View>
          <AppText variant="body" tone="secondary">
            {ble.status === 'connected' ? 'bpm · live' : 'bpm · latest reading'}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatTile value={stats.resting !== null ? String(stats.resting) : '—'} label="Resting avg" />
          <StatTile value={stats.count > 0 ? String(stats.average) : '—'} label="7-day avg" />
          <StatTile
            value={stats.count > 0 ? `${stats.min}–${stats.max}` : '—'}
            label="Range"
          />
        </View>

        <Panel style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <AppText style={{ fontFamily: fonts.black, fontSize: 22, letterSpacing: -0.8 }}>
              Trend
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              Recent readings
            </AppText>
          </View>
          <Trend readings={readings} width={width} />
        </Panel>

        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <AppText style={{ fontFamily: fonts.black, fontSize: 26, letterSpacing: -1.2 }}>
              Recent readings
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              Last 7 days
            </AppText>
          </View>

          {readings.length === 0 ? (
            <EmptyState
              icon="heart"
              title="No heart-rate data"
              message="Log a manual pulse check, or connect a Bluetooth monitor."
              actionLabel="Log manually"
              onAction={() => setManualVisible(true)}
            />
          ) : (
            <View>
              {readings.slice(0, 7).map((reading, index) => {
                const badge = activityLabel(reading.activity_type);
                const badgeColor = activityColor(reading.activity_type, colors);
                return (
                  <View
                    key={reading.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: space.md,
                      paddingVertical: space.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.separator,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                        <AppText
                          style={{
                            color: colors.text,
                            fontFamily: fonts.black,
                            fontSize: 32,
                            lineHeight: 34,
                            letterSpacing: -1.4,
                          }}
                        >
                          {reading.heart_rate}
                        </AppText>
                        <AppText variant="callout" tone="secondary">
                          bpm
                        </AppText>
                      </View>
                      <AppText variant="footnote" tone="secondary">
                        {formatReadingTime(reading.timestamp)}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 5 }}>
                      <View
                        style={{
                          borderRadius: radius.pill,
                          backgroundColor: `${badgeColor}24`,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                        }}
                      >
                        <AppText
                          style={{
                            color: badgeColor,
                            fontFamily: fonts.bold,
                            fontSize: 11,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                          }}
                        >
                          {badge}
                        </AppText>
                      </View>
                      <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
                        {reading.source_device === 'manual'
                          ? 'Manual'
                          : reading.source_device ?? 'Device'}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Log a reading"
              variant="secondary"
              onPress={() => setManualVisible(true)}
            />
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
            {ble.status === 'scanning'
              ? 'Scanning for a heart-rate monitor…'
              : 'Connecting…'}
          </AppText>
        ) : null}
        {ble.message ? (
          <AppText variant="footnote" tone={ble.status === 'error' ? 'danger' : 'secondary'}>
            {ble.message}
          </AppText>
        ) : null}
      </View>

      <HeartManualSheet
        visible={manualVisible}
        onClose={() => setManualVisible(false)}
        initialBpm={stats.latest ?? 64}
      />
    </>
  );
};
