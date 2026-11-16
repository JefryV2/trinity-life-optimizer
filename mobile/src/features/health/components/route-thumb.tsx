import { useMemo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

export type RoutePoint = { lat: number; lng: number };

const PAD = 3;

/**
 * A saved walk's footprint, reduced to one quiet line. This is deliberately
 * not a WebView map: a list can hold twenty walks, and each one only needs to
 * show its shape, start and finish.
 */
export const RouteThumb = ({
  segments,
  width = 64,
  height = 40,
}: {
  segments: RoutePoint[][] | null | undefined;
  width?: number;
  height?: number;
}) => {
  const { colors } = useTheme();

  const drawing = useMemo(() => {
    const lines = (segments ?? []).filter((segment) => segment.length > 0);
    const points = lines.flat();
    if (points.length === 0) return null;

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const lngScale = Math.cos((midLat * Math.PI) / 180);
    const spanX = Math.max(1e-6, (maxLng - minLng) * lngScale);
    const spanY = Math.max(1e-6, maxLat - minLat);
    const scale = Math.min((width - PAD * 2) / spanX, (height - PAD * 2) / spanY);
    const offsetX = (width - spanX * scale) / 2;
    const offsetY = (height - spanY * scale) / 2;

    const project = (point: RoutePoint) => ({
      x: offsetX + (point.lng - minLng) * lngScale * scale,
      y: offsetY + (maxLat - point.lat) * scale,
    });

    const paths = lines.map((segment) =>
      segment
        .map((point, index) => {
          const projected = project(point);
          return `${index === 0 ? 'M' : 'L'}${projected.x.toFixed(1)} ${projected.y.toFixed(1)}`;
        })
        .join(' '),
    );

    const first = project(lines[0][0]);
    const finalLine = lines[lines.length - 1];
    const last = project(finalLine[finalLine.length - 1]);

    return { paths, first, last };
  }, [height, segments, width]);

  if (!drawing) return null;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
      {drawing.paths.map((path, index) => (
        <Path
          key={`casing-${index}`}
          d={path}
          stroke={colors.background}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {drawing.paths.map((path, index) => (
        <Path
          key={`line-${index}`}
          d={path}
          stroke={colors.primary}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <Circle
        cx={drawing.first.x}
        cy={drawing.first.y}
        r={2.6}
        fill={colors.primary}
        stroke={colors.background}
        strokeWidth={1.2}
      />
      <Circle
        cx={drawing.last.x}
        cy={drawing.last.y}
        r={2.4}
        fill={colors.text}
        stroke={colors.primary}
        strokeWidth={1.2}
      />
    </Svg>
  );
};
