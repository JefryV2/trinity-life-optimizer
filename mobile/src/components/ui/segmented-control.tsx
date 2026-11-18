import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Astryx's Segmented Control, adapted to the app's tokens and React Native.
 * A single selection from a small set of mutually exclusive values, not page
 * navigation.
 */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) => {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 3,
        gap: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            hitSlop={6}
            style={({ pressed }) => ({
              paddingHorizontal: space.md,
              minHeight: 28,
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.primary : 'transparent',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="mono" tone={selected ? 'onPrimary' : 'tertiary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};
