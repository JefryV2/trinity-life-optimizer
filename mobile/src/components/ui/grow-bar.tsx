import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

/** A static measure line. The value is already readable; it should not move. */
export const GrowBar = ({
  ratio,
  color,
  height = 5,
}: {
  ratio: number;
  color: string;
  /** Kept for call-site compatibility; bars no longer animate. */
  delay?: number;
  height?: number;
}) => {
  const { colors } = useTheme();
  const target = Math.max(0, Math.min(100, ratio * 100));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target) }}
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${target}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: color,
        }}
      />
    </View>
  );
};
