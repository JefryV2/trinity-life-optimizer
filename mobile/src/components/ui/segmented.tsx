import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, shadow, space, useTheme } from '@/theme';

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

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
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.inner,
        borderCurve: 'continuous',
        padding: 4,
        gap: 4,
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
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.small,
              borderCurve: 'continuous',
              backgroundColor: selected ? colors.surface : 'transparent',
              boxShadow: selected ? shadow.card : undefined,
            }}
          >
            <AppText
              variant="callout"
              tone={selected ? 'default' : 'secondary'}
              style={{ fontWeight: selected ? '600' : '500' }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};
