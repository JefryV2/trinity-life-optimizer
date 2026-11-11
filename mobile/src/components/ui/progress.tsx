import { View } from 'react-native';

import { useTheme } from '@/theme';

export const Progress = ({
  value,
  color,
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) => {
  const { colors } = useTheme();
  const percent = Math.min(100, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
};
