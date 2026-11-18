import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * One series, one accent, muted gridlines and a baseline. The values are read
 * from the grid, not printed above every bar. Recent bars can be highlighted
 * and a target line can sit behind them.
 */
export const BarChart = ({
  data,
  maxValue,
  color,
  height = 160,
  targetValue,
  highlightLast = false,
  mutedColor,
  startLabel,
  endLabel,
  showLabels = true,
}: {
  data: BarDatum[];
  maxValue?: number;
  color?: string;
  height?: number;
  targetValue?: number;
  highlightLast?: boolean;
  mutedColor?: string;
  startLabel?: string;
  endLabel?: string;
  showLabels?: boolean;
}) => {
  const { colors } = useTheme();
  const max = Math.max(maxValue ?? 0, targetValue ?? 0, ...data.map((d) => d.value), 1);
  const plot = height;
  const activeColor = color ?? colors.primary;
  const quietColor = mutedColor ?? 'rgba(198,242,78,0.26)';
  const targetRatio =
    targetValue === undefined ? null : Math.max(0, Math.min(1, targetValue / max));

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height }}>
        {targetRatio !== null ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: plot * targetRatio,
              borderTopWidth: 1,
              borderStyle: 'dashed',
              borderTopColor: colors.textFaint,
            }}
          />
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 4,
            height: plot,
          }}
        >
          {data.map((datum, index) => {
            const ratio = Math.max(0.02, datum.value / max);
            const isLast = index === data.length - 1;
            const barColor = highlightLast && !isLast ? quietColor : activeColor;
            return (
              <View key={`${datum.label}-${index}`} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(3, plot * ratio),
                    borderRadius: 4,
                    backgroundColor: datum.value > 0 ? barColor : colors.surfaceSunken,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
      {showLabels ? (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {data.map((datum, index) => (
            <AppText
              key={`${datum.label}-${index}`}
              variant="mono"
              tone="tertiary"
              style={{ flex: 1, textAlign: 'center' }}
              numberOfLines={1}
            >
              {datum.label}
            </AppText>
          ))}
        </View>
      ) : startLabel || endLabel ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="mono" tone="tertiary">
            {startLabel}
          </AppText>
          <AppText variant="mono" tone="primary">
            {endLabel}
          </AppText>
        </View>
      ) : null}
    </View>
  );
};
