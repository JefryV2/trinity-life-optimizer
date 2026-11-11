import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

/**
 * Two measures against each other — one dot per day. Axes are unlabelled numbers
 * deliberately: the point is the shape, and the row underneath names the ranges.
 */
export const ScatterChart = ({
  points,
  width,
  height = 168,
  xMax,
  yMax,
  xLabel,
  yLabel,
  color,
}: {
  points: Array<{ x: number; y: number }>;
  width: number;
  height?: number;
  xMax?: number;
  yMax?: number;
  xLabel?: string;
  yLabel?: string;
  color?: string;
}) => {
  const { colors } = useTheme();
  const pad = 8;
  const maxX = xMax ?? Math.max(1, ...points.map((point) => point.x));
  const maxY = yMax ?? Math.max(1, ...points.map((point) => point.y));

  return (
    <View style={{ gap: space.sm }}>
      <Svg width={width} height={height}>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            x1={0}
            y1={pad + (height - pad * 2) * ratio}
            x2={width}
            y2={pad + (height - pad * 2) * ratio}
            stroke={colors.separator}
            strokeWidth={1}
          />
        ))}
        <Line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke={colors.border}
          strokeWidth={1}
        />
        {points.map((point, index) => {
          const x = pad + (point.x / maxX) * (width - pad * 2);
          const y = height - pad - (point.y / maxY) * (height - pad * 2);
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r={3.5}
              fill={color ?? colors.primary}
              opacity={0.75}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="tertiary">
          {xLabel ?? ''}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {yLabel ?? ''}
        </AppText>
      </View>
    </View>
  );
};
