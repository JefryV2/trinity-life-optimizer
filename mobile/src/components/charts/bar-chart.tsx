import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

export interface BarDatum {
  label: string;
  value: number;
}

export const BarChart = ({
  data,
  maxValue,
  color,
  height = 120,
  formatValue,
}: {
  data: BarDatum[];
  maxValue?: number;
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
}) => {
  const { colors } = useTheme();
  const max = Math.max(maxValue ?? 0, ...data.map((d) => d.value), 1);

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, height }}>
        {data.map((datum, index) => {
          const ratio = Math.max(0.04, datum.value / max);
          return (
            <View key={`${datum.label}-${index}`} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <AppText variant="caption" tone="tertiary" style={{ fontSize: 10 }}>
                {formatValue ? formatValue(datum.value) : Math.round(datum.value)}
              </AppText>
              <View
                style={{
                  width: '100%',
                  height: Math.max(4, (height - 34) * ratio),
                  borderRadius: 6,
                  backgroundColor: color ?? colors.primary,
                  opacity: 0.85,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {data.map((datum, index) => (
          <AppText
            key={`${datum.label}-${index}`}
            variant="caption"
            tone="tertiary"
            style={{ flex: 1, textAlign: 'center', fontSize: 10 }}
            numberOfLines={1}
          >
            {datum.label}
          </AppText>
        ))}
      </View>
    </View>
  );
};
