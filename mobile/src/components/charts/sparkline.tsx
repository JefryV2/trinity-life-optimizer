import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * A single line on a quiet baseline. The last point gets a small mark so the
 * eye lands on where the series actually ends.
 */
export const Sparkline = ({
  values,
  width = 280,
  height = 56,
  color,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) => {
  const { colors } = useTheme();
  if (values.length < 2) return <View style={{ height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 6 - ((value - min) / span) * (height - 14);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(',');

  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke={colors.separator} strokeWidth={1} />
      <Path
        d={`M ${points.join(' L ')}`}
        stroke={color ?? colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={Number(last[0])} cy={Number(last[1])} r={2.5} fill={color ?? colors.primary} />
    </Svg>
  );
};
