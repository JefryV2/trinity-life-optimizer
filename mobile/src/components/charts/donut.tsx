import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { fonts, useTheme } from '@/theme';

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * A multi-segment ring. Segments are laid end to end around the circle, so the
 * largest slice is the story. No legend is drawn here — the screen supplies its
 * own, in the app's type.
 */
export const Donut = ({
  segments,
  size = 168,
  stroke = 20,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  centerValue?: string;
  centerLabel?: string;
}) => {
  const { colors } = useTheme();
  const mid = size / 2;
  const r = mid - stroke / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0) || 1;
  let offset = 0;

  return (
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
        {segments.map((segment) => {
          const fraction = Math.max(0, segment.value) / total;
          const dash = fraction * circumference;
          const circle = (
            <Circle
              key={segment.key}
              cx={mid}
              cy={mid}
              r={r}
              stroke={segment.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              rotation={-90}
              origin={`${mid}, ${mid}`}
            />
          );
          offset += dash;
          return circle;
        })}
      </Svg>
      <View style={{ alignItems: 'center' }}>
        {centerValue ? (
          <AppText
            variant="numeric"
            style={{ fontFamily: fonts.bold, fontSize: size >= 150 ? 26 : 20 }}
          >
            {centerValue}
          </AppText>
        ) : null}
        {centerLabel ? (
          <AppText variant="caption" tone="tertiary" style={{ marginTop: -2 }}>
            {centerLabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};
