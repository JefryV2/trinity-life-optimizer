import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme';

export interface RadarDatum {
  label: string;
  value: number;
}

export const RadarChart = ({
  data,
  size = 240,
  maxValue = 100,
}: {
  data: RadarDatum[];
  size?: number;
  maxValue?: number;
}) => {
  const { colors } = useTheme();
  const center = size / 2;
  const radius = size * 0.34;
  const labelRadius = size * 0.45;
  const angleFor = (index: number) => -Math.PI / 2 + (index * Math.PI * 2) / data.length;
  const point = (index: number, value: number) => {
    const angle = angleFor(index);
    const distance = radius * Math.max(0, Math.min(1, value / maxValue));
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance] as const;
  };
  const outer = data.map((_, index) => point(index, maxValue).join(',')).join(' ');
  const inner = data.map((datum, index) => point(index, datum.value).join(',')).join(' ');

  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <Circle
          key={ratio}
          cx={center}
          cy={center}
          r={radius * ratio}
          stroke={colors.separator}
          strokeWidth={1}
          fill="none"
        />
      ))}
      {data.map((datum, index) => {
        const [x, y] = point(index, maxValue);
        return (
          <Line key={datum.label} x1={center} y1={center} x2={x} y2={y} stroke={colors.separator} strokeWidth={1} />
        );
      })}
      <Polygon points={outer} stroke={colors.separator} strokeWidth={1} fill="none" />
      <Polygon points={inner} stroke={colors.primary} strokeWidth={2} fill={colors.primary} fillOpacity={0.18} />
      {data.map((datum, index) => {
        const angle = angleFor(index);
        const labelX = center + Math.cos(angle) * labelRadius;
        const labelY = center + Math.sin(angle) * labelRadius;
        return (
          <SvgText
            key={datum.label}
            x={labelX}
            y={labelY}
            fill={colors.textSecondary}
            fontSize={12}
            fontWeight="600"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {datum.label}
          </SvgText>
        );
      })}
    </Svg>
  );
};