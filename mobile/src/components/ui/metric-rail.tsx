import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

const SEGMENTS = 10;

/**
 * Astryx's ProgressBar anatomy, adapted to a 10-point wellbeing scale: name,
 * value, track, and a filled portion that keeps its meaning without colour
 * alone. The rail is read as a whole; its ten blocks are not separate targets.
 */
export const MetricRail = ({
  label,
  value,
  color,
  valueLabel,
}: {
  label: string;
  value: number | null;
  color: string;
  valueLabel?: string;
}) => {
  const { colors } = useTheme();
  const filled = value === null ? 0 : Math.max(0, Math.min(SEGMENTS, Math.round(value)));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={
        value === null
          ? { min: 0, max: SEGMENTS, text: 'Not logged' }
          : { min: 0, max: SEGMENTS, now: filled }
      }
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md }}>
        <AppText variant="callout">{label}</AppText>
        <AppText variant="footnote" tone="secondary">
          {value === null ? 'Not logged' : valueLabel ?? `${value} / 10`}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 7,
              borderRadius: 2,
              backgroundColor: index < filled ? color : colors.surfaceSunken,
            }}
          />
        ))}
      </View>
    </View>
  );
};
