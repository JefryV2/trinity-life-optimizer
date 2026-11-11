import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { radius, useTheme } from '@/theme';

/**
 * Draws once on mount. Width is animated rather than scaleX because React
 * Native has no transform-origin, and a one-shot entrance on an occasional
 * screen is the one place a layout property is acceptable.
 */
export const GrowBar = ({
  ratio,
  color,
  delay = 0,
  height = 5,
}: {
  ratio: number;
  color: string;
  delay?: number;
  height?: number;
}) => {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);
  const target = Math.max(0, Math.min(100, ratio * 100));

  useEffect(() => {
    if (reduce) {
      progress.value = target;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(target, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, progress, reduce, target]);

  const style = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: radius.pill, backgroundColor: color }, style]}
      />
    </View>
  );
};
