import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * A short settle-in for a section that appears once. Motion is opacity plus a
 * 6px lift, 220ms, staggered by index — enough to keep the page from teleporting
 * without animating anything the reader is already studying.
 *
 * This uses a mount-bound timing rather than an `entering` animation so a
 * section can never be left stranded at a partial opacity when a tab is frozen
 * or restored.
 */
export const Reveal = ({
  children,
  index = 0,
  delay = 0,
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
}) => {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0);
  const lift = useSharedValue(6);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      lift.value = 0;
      return;
    }
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 220 });
      lift.value = withTiming(0, { duration: 220 });
    }, delay + index * 45);
    return () => clearTimeout(timer);
  }, [delay, index, lift, opacity, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
};
