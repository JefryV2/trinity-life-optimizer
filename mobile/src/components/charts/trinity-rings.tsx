import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface TrinityRingItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

const Ring = ({
  mid,
  r,
  stroke,
  value,
  color,
  track,
}: {
  mid: number;
  r: number;
  stroke: number;
  value: number;
  color: string;
  track: string;
}) => {
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduced ? clamped : withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, progress, reduced]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (progress.value / 100) * circumference,
  }));

  return (
    <G>
      <Circle cx={mid} cy={mid} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={mid}
        cy={mid}
        r={r}
        stroke={color}
        strokeWidth={stroke}
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
 * Three concentric activity rings — Health outer, Wealth middle, People inner —
 * with the Trinity average sitting in the middle. Each ring draws to its
 * pillar's score once, so the day arrives as one circular object.
 */
export const TrinityRings = ({
  rings,
  size = 196,
  stroke = 13,
  gap = 7,
  center,
  centerLabel,
  centerSize = 56,
}: {
  rings: TrinityRingItem[];
  size?: number;
  stroke?: number;
  gap?: number;
  center?: string | number;
  centerLabel?: string;
  centerSize?: number;
}) => {
  const { colors } = useTheme();
  const mid = size / 2;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Life score ${center ?? 'not logged'}. ${rings
        .map((ring) => `${ring.label} ${Math.round(ring.value)}`)
        .join(', ')}.`}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {rings.map((ring, index) => {
          const r = mid - stroke / 2 - index * (stroke + gap);
          return (
            <Ring
              key={ring.key}
              mid={mid}
              r={r}
              stroke={stroke}
              value={ring.value}
              color={ring.color}
              track={colors.surfaceSunken}
            />
          );
        })}
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <AppText variant="numeric" selectable style={{ fontSize: centerSize, lineHeight: centerSize + 2 }}>
          {center ?? '—'}
        </AppText>
        {centerLabel ? (
          <AppText
            variant="caption"
            tone="tertiary"
            style={{ letterSpacing: 2, fontSize: 9, marginTop: -2 }}
          >
            {centerLabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};
