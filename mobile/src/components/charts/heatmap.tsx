import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { moodColor } from '@/lib/health-colors';
import { space, useTheme } from '@/theme';

/**
 * A small grid of days. Colour carries the value, so a week of mood reads as a
 * pattern rather than a list of numbers. Unlogged days stay sunken.
 */
export const Heatmap = ({
  days,
  cell = 30,
  colorFor = moodColor,
}: {
  days: Array<{ label: string; value: number | null }>;
  cell?: number;
  colorFor?: (value: number) => string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {days.map((day, index) => (
          <View
            key={`${day.label}-${index}`}
            accessibilityLabel={`${day.label}: ${day.value ?? 'not logged'}`}
            style={{
              width: cell,
              height: cell,
              borderRadius: 7,
              backgroundColor:
                day.value === null ? colors.surfaceSunken : colorFor(day.value),
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="tertiary">
          {days[0]?.label ?? ''}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {days[days.length - 1]?.label ?? ''}
        </AppText>
      </View>
    </View>
  );
};
