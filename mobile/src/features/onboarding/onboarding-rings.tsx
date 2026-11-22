import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Progress = [number, number, number];

const Ring = ({
  mid,
  radius,
  progress,
  ink,
  opacity,
}: {
  mid: number;
  radius: number;
  progress: number;
  ink: string;
  opacity: number;
}) => {
  const circumference = 2 * Math.PI * radius;
  const reduced = useReducedMotion();
  const value = useSharedValue(progress);

  useEffect(() => {
    value.value = reduced
      ? progress
      : withTiming(progress, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [progress, reduced, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <G>
      <Circle
        cx={mid}
        cy={mid}
        r={radius}
        stroke={ink}
        strokeOpacity={0.05}
        strokeWidth={11}
        fill="none"
      />
      <AnimatedCircle
        cx={mid}
        cy={mid}
        r={radius}
        stroke={ink}
        strokeOpacity={opacity}
        strokeWidth={11}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        rotation={-90}
        origin={`${mid}, ${mid}`}
      />
    </G>
  );
};

/**
 * The oversized rings behind onboarding. They are deliberately cropped by the
 * screen edge and move to a different corner on each step, so the page changes
 * without a hard divider or a card.
 */
export const OnboardingRings = ({
  step,
  progress,
  ink,
}: {
  step: 1 | 2 | 3;
  progress: Progress;
  ink: string;
}) => {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const size = useSharedValue(600);
  const spin = useSharedValue(0);

  const target = useMemo(() => {
    if (step === 1) {
      const next = Math.max(width * 1.55, 560);
      return { left: width / 2 - next / 2, top: -next * 0.32, size: next };
    }
    if (step === 2) {
      const next = Math.max(width * 1.85, 660);
      return { left: width - next * 0.42, top: height - next * 0.51, size: next };
    }
    const next = Math.max(width * 1.8, 640);
    return { left: -next * 0.55, top: -next * 0.4, size: next };
  }, [height, step, width]);

  useEffect(() => {
    if (reduced) {
      left.value = target.left;
      top.value = target.top;
      size.value = target.size;
      return;
    }
    const timing = { duration: 950, easing: Easing.bezier(0.55, 0, 0.2, 1) };
    left.value = withTiming(target.left, timing);
    top.value = withTiming(target.top, timing);
    size.value = withTiming(target.size, timing);
  }, [left, reduced, size, target, top]);

  useEffect(() => {
    if (reduced) return;
    spin.value = withRepeat(withTiming(360, { duration: 60_000, easing: Easing.linear }), -1);
  }, [reduced, spin]);

  const box = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    width: size.value,
    height: size.value,
  }));
  const rotation = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', zIndex: 0 }, box]}>
      <Animated.View style={[{ width: '100%', height: '100%' }, rotation]}>
        <Svg width="100%" height="100%" viewBox="0 0 140 140">
          <Ring mid={70} radius={60} progress={progress[0]} ink={ink} opacity={0.14} />
          <Ring mid={70} radius={46} progress={progress[1]} ink={ink} opacity={0.2} />
          <Ring mid={70} radius={32} progress={progress[2]} ink={ink} opacity={0.28} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

/**
 * The three coloured rings used on the completion card. They pop in once, then
 * the auth transition takes over.
 */
export const CompletionRings = ({
  size = 220,
  colors,
}: {
  size?: number;
  colors: [string, string, string];
}) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.3);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    scale.value = withTiming(1, { duration: 780, easing: Easing.out(Easing.back(1.4)) });
    opacity.value = withTiming(1, { duration: 420 });
  }, [opacity, reduced, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 140 140">
        <Circle cx={70} cy={70} r={60} stroke={colors[0]} strokeWidth={11} fill="none" />
        <Circle cx={70} cy={70} r={46} stroke={colors[1]} strokeWidth={11} fill="none" />
        <Circle cx={70} cy={70} r={32} stroke={colors[2]} strokeWidth={11} fill="none" />
      </Svg>
    </Animated.View>
  );
};
