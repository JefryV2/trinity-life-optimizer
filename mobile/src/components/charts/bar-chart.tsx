import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * One series, one accent, muted gridlines and a baseline. The values are read
 * from the grid, not printed above every bar.
 */
export const BarChart = ({
  data,
  maxValue,
  color,
  height = 160,
}: {
  data: BarDatum[];
  maxValue?: number;
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
}) => {
  const { colors } = useTheme();
  const max = Math.max(maxValue ?? 0, ...data.map((d) => d.value), 1);
  const plot = height - 22;

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height, justifyContent: 'flex-end' }}>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <View
            key={ratio}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 22 + plot * ratio,
              height: 1,
              backgroundColor: colors.separator,
            }}
          />
        ))}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 2,
            height: plot,
          }}
        >
          {data.map((datum, index) => {
            const ratio = Math.max(0.02, datum.value / max);
            return (
              <View key={`${datum.label}-${index}`} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(2, plot * ratio),
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    backgroundColor: color ?? colors.primary,
                  }}
                />
              </View>
            );
          })}
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 0 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 2 }}>
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
    </View>
  );
};
