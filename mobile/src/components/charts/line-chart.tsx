import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

/**
 * The screen's main chart: one line, muted gridlines, a baseline and only the
 * first and last date for context. No per-point labels.
 */
export const LineChart = ({
  values,
  width,
  height = 180,
  maxValue = 100,
  color,
  startLabel,
  endLabel,
}: {
  values: number[];
  width: number;
  height?: number;
  maxValue?: number;
  color?: string;
  startLabel?: string;
  endLabel?: string;
}) => {
  const { colors } = useTheme();
  const plot = height - 10;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = 4 + (1 - Math.min(1, Math.max(0, value / maxValue))) * (plot - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1]?.split(',') ?? ['0', '0'];

  return (
    <View style={{ gap: space.sm }}>
      <Svg width={width} height={height}>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            x1={0}
            y1={4 + (plot - 8) * ratio}
            x2={width}
            y2={4 + (plot - 8) * ratio}
            stroke={colors.separator}
            strokeWidth={1}
          />
        ))}
        <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke={colors.border} strokeWidth={1} />
        {values.length > 1 ? (
          <Path
            d={`M ${points.join(' L ')}`}
            stroke={color ?? colors.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
        <Circle cx={Number(last[0])} cy={Number(last[1])} r={3} fill={color ?? colors.primary} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="mono" tone="tertiary">
          {startLabel ?? ''}
        </AppText>
        <AppText variant="mono" tone="tertiary">
          {endLabel ?? ''}
        </AppText>
      </View>
    </View>
  );
};
