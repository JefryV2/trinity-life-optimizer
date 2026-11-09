import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

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
    const y = height - 4 - ((value - min) / span) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <Svg width={width} height={height}>
      <Path
        d={`M ${points.join(' L ')}`}
        stroke={color ?? colors.primary}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};
