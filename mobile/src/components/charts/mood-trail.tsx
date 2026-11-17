import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { formatDate } from '@/lib/format';
import { space, useTheme } from '@/theme';

export interface MoodPoint {
  date: string;
  value: number;
}

/**
 * A daily mood trail: a thin neutral line, one accent for the reading, and a
 * dashed average. The shape carries the meaning; the colour stays Health lime.
 */
export const MoodTrail = ({
  points,
  width,
  height = 152,
}: {
  points: MoodPoint[];
  width: number;
  height?: number;
}) => {
  const { colors } = useTheme();
  if (points.length === 0) return null;

  const padTop = 10;
  const padBottom = 10;
  const plotHeight = height - padTop - padBottom;
  const lastIndex = Math.max(1, points.length - 1);
  const xFor = (index: number) =>
    points.length === 1 ? width / 2 : 4 + (index / lastIndex) * (width - 8);
  const yFor = (value: number) => padTop + (1 - Math.min(10, Math.max(0, value)) / 10) * plotHeight;
  const average = points.reduce((sum, point) => sum + point.value, 0) / points.length;
  const coords = points.map((point, index) => `${xFor(index).toFixed(1)},${yFor(point.value).toFixed(1)}`);
  const path = coords.length > 1 ? `M ${coords.join(' L ')}` : '';
  const dotRadius = points.length > 14 ? 3.4 : 4.5;

  return (
    <View
      accessibilityLabel={`Mood trail, ${points.length} days, average ${average.toFixed(1)} out of 10`}
      style={{ gap: space.sm }}
    >
      <Svg width={width} height={height}>
        {[0, 5, 10].map((value) => (
          <Line
            key={value}
            x1={0}
            y1={yFor(value)}
            x2={width}
            y2={yFor(value)}
            stroke={value === 0 ? colors.border : colors.separator}
            strokeWidth={1}
          />
        ))}
        <Line
          x1={0}
          y1={yFor(average)}
          x2={width}
          y2={yFor(average)}
          stroke={colors.textFaint}
          strokeWidth={1}
          strokeDasharray="2 5"
        />
        {path ? (
          <Path
            d={path}
            stroke={colors.textFaint}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.72}
          />
        ) : null}
        {points.map((point, index) => (
          <Circle
            key={`${point.date}-${index}`}
            cx={xFor(index)}
            cy={yFor(point.value)}
            r={dotRadius}
            fill={colors.primary}
            stroke={colors.background}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="mono" tone="tertiary">
          {formatDate(`${points[0].date}T12:00:00`)}
        </AppText>
        <AppText variant="mono" tone="tertiary">
          {formatDate(`${points[points.length - 1].date}T12:00:00`)}
        </AppText>
      </View>
    </View>
  );
};
