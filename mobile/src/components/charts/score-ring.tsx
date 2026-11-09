import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme';

export const ScoreRing = ({
  score,
  size = 84,
  stroke = 8,
  color,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) => {
  const { colors } = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <AppText variant="headline" selectable style={{ fontVariant: ['tabular-nums'] }}>
        {Math.round(clamped)}
      </AppText>
      {label ? (
        <AppText variant="caption" tone="tertiary">
          {label}
        </AppText>
      ) : null}
    </View>
  );
};
