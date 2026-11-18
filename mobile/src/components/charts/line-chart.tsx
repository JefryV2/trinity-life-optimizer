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
  minValue,
  maxValue = 100,
  color,
  startLabel,
  endLabel,
  fill = false,
  grid = true,
}: {
  values: number[];
  width: number;
  height?: number;
  /** Set a data-driven minimum for money charts. Omit for 0-based scores. */
  minValue?: number;
  maxValue?: number;
  color?: string;
  startLabel?: string;
  endLabel?: string;
  fill?: boolean;
  grid?: boolean;
}) => {
  const { colors } = useTheme();
  const plot = height - 10;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const low = minValue ?? 0;
  const high = Math.max(maxValue, low + 1);
  const span = high - low;
  // Money charts should show movement, not a flat line pinned to the ceiling.
  // A small padded domain keeps a £0 change visible and centred.
  const pad = minValue === undefined ? 0 : span > 0 ? span * 0.12 : Math.max(1, high * 0.02);
  const domainLow = low - pad;
  const domainHigh = high + pad;
  const domainSpan = Math.max(1, domainHigh - domainLow);
  const points = values.map((value, index) => {
    const x = index * step;
    const normalized = minValue === undefined
      ? Math.min(1, Math.max(0, value / high))
      : Math.min(1, Math.max(0, (value - domainLow) / domainSpan));
    const y = 4 + (1 - normalized) * (plot - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1]?.split(',') ?? ['0', '0'];

  return (
    <View style={{ gap: space.sm }}>
      <Svg width={width} height={height}>
        {grid
          ? [0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            x1={0}
            y1={4 + (plot - 8) * ratio}
            x2={width}
            y2={4 + (plot - 8) * ratio}
              stroke={colors.separator}
              strokeWidth={1}
            />
          ))
          : null}
        <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke={colors.border} strokeWidth={1} />
        {fill && values.length > 1 ? (
          <Path
            d={`M 0,${height - 1} L ${points.join(' L ')} L ${width},${height - 1} Z`}
            fill={color ?? colors.primary}
            opacity={0.14}
          />
        ) : null}
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
