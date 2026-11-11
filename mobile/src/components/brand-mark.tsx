import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const drawEasing = Easing.out(Easing.cubic);

/**
 * The mark: three interlocking rings, one per pillar — Health lime, Wealth
 * amber, Bonds blue. On mount each ring draws itself; the whole mark then
 * breathes very slightly so it feels alive without spinning like a loader.
 */
const Ring = ({
  cx,
  cy,
  r,
  stroke,
  color,
  delay,
  animate,
}: {
  cx: number;
  cy: number;
  r: number;
  stroke: number;
  color: string;
  delay: number;
  animate: boolean;
}) => {
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1000, easing: drawEasing }),
    );
  }, [animate, delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - progress.value * circumference,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={`${circumference} ${circumference}`}
      animatedProps={animatedProps}
      rotation={-90}
      origin={`${cx}, ${cy}`}
    />
  );
};

export const BrandMark = ({
  size = 64,
  animated = true,
}: {
  size?: number;
  animated?: boolean;
}) => {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const animate = animated && !reduce;

  const stroke = Math.max(1.5, size * 0.052);
  const r = size * 0.235;
  const offset = size * 0.185;
  const cx = size / 2;
  const cy = size / 2;

  const breath = useSharedValue(1);
  useEffect(() => {
    if (!animate) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(1.045, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [animate, breath]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, breathStyle]}
    >
      <Svg width={size} height={size}>
        <Ring
          cx={cx}
          cy={cy - offset}
          r={r}
          stroke={stroke}
          color={colors.health}
          delay={0}
          animate={animate}
        />
        <Ring
          cx={cx - offset * 0.866}
          cy={cy + offset * 0.5}
          r={r}
          stroke={stroke}
          color={colors.wealth}
          delay={160}
          animate={animate}
        />
        <Ring
          cx={cx + offset * 0.866}
          cy={cy + offset * 0.5}
          r={r}
          stroke={stroke}
          color={colors.bonds}
          delay={320}
          animate={animate}
        />
      </Svg>
    </Animated.View>
  );
};
