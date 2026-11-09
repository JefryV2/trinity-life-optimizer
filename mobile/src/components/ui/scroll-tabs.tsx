import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

interface ScrollTabsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

/** Horizontally scrolling pill tabs for hubs with more segments than fit one row. */
export const ScrollTabs = <T extends string>({ options, value, onChange }: ScrollTabsProps<T>) => {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: 2 }}
      style={{ marginHorizontal: -space.xl, paddingHorizontal: space.xl }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              minHeight: 40,
              paddingHorizontal: space.lg,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.primary : colors.surfaceAlt,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <AppText
              variant="footnote"
              style={{
                color: selected ? colors.onPrimary : colors.textSecondary,
                fontWeight: '600',
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
      <View style={{ width: space.sm }} />
    </ScrollView>
  );
};