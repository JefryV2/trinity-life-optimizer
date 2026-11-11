import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

/** A ruled switch, not a boxed control: labels on a hairline, lime underline. */
export const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) => {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: space.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
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
            style={({ pressed }) => ({
              paddingVertical: space.sm,
              borderBottomWidth: 2,
              borderBottomColor: selected ? colors.primary : 'transparent',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="footnote" tone={selected ? 'default' : 'secondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};
