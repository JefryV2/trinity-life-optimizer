import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { fonts, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * One small ring with a value in the middle. Reused for the Health vitals,
 * budgets and the cycle day so the ring language stays consistent everywhere.
 */
export const RingMeter = ({
  value,
  max = 100,
  size = 64,
  stroke = 6,
  color,
  label,
  center,
  sublabel,
  tone,
  centerSize,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  center?: string;
  sublabel?: string;
  tone?: string;
  /** Override the numeral size for large rings (the walk timer). */
  centerSize?: number;
}) => {
  const { colors } = useTheme();
  const mid = size / 2;
  const r = mid - stroke / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, value / max));
  const ringColor = color ?? colors.primary;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(ratio, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, ratio]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - progress.value * circumference,
  }));

  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle
            cx={mid}
            cy={mid}
            r={r}
            stroke={colors.surfaceSunken}
            strokeWidth={stroke}
            fill="none"
          />
          <AnimatedCircle
            cx={mid}
            cy={mid}
            r={r}
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
            rotation={-90}
            origin={`${mid}, ${mid}`}
          />
        </Svg>
        <AppText
          variant="footnote"
          style={{
            fontFamily: fonts.bold,
            fontSize: centerSize ?? (size >= 80 ? 18 : 14),
            color: tone ?? colors.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {center ?? Math.round(value)}
        </AppText>
      </View>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.3 }}>
          {label}
        </AppText>
      ) : null}
      {sublabel ? (
        <AppText variant="caption" tone="tertiary" style={{ marginTop: -3 }}>
          {sublabel}
        </AppText>
      ) : null}
    </View>
  );
};
