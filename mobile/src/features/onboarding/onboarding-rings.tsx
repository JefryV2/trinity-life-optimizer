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
      : withTiming(progress, { duration: 420, easing: Easing.out(Easing.cubic) });
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

  const target = useMemo(() => {
    const base = Math.max(width, height);
    let size: number;
    let left: number;
    let top: number;

    if (step === 1) {
      size = Math.max(width * 1.55, 560);
      left = width / 2 - size / 2;
      top = -size * 0.32;
    } else if (step === 2) {
      size = Math.max(width * 1.85, 660);
      left = width - size * 0.42;
      top = height - size * 0.51;
    } else {
      size = Math.max(width * 1.8, 640);
      left = -size * 0.55;
      top = -size * 0.4;
    }

    return {
      base,
      x: left + size / 2 - width / 2,
      y: top + size / 2 - height / 2,
      scale: size / base,
    };
  }, [height, step, width]);

  // Move the rings with transforms only. Animating left/top/width/height makes
  // the SVG relayout on every frame, which is what makes the steps feel rough.
  const x = useSharedValue(target.x);
  const y = useSharedValue(target.y);
  const scale = useSharedValue(target.scale);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      x.value = target.x;
      y.value = target.y;
      scale.value = target.scale;
      return;
    }
    const timing = { duration: 420, easing: Easing.out(Easing.cubic) };
    x.value = withTiming(target.x, timing);
    y.value = withTiming(target.y, timing);
    scale.value = withTiming(target.scale, timing);
  }, [reduced, scale, target, x, y]);

  useEffect(() => {
    if (reduced) return;
    spin.value = withRepeat(withTiming(360, { duration: 60_000, easing: Easing.linear }), -1);
  }, [reduced, spin]);

  const box = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));
  const rotation = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: width / 2 - target.base / 2,
          top: height / 2 - target.base / 2,
          width: target.base,
          height: target.base,
          zIndex: 0,
        },
        box,
      ]}
    >
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
  const scale = useSharedValue(reduced ? 1 : 0.86);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    scale.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
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
