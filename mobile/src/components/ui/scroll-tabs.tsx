import { Pressable, ScrollView } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

interface ScrollTabsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

/** Ruled tabs: a label and a short underline, no pills. */
export const ScrollTabs = <T extends string>({ options, value, onChange }: ScrollTabsProps<T>) => {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.xl }}
      style={{
        marginHorizontal: -space.xl,
        paddingHorizontal: space.xl,
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
            onPress={() => {
              onChange(option.value);
            }}
            style={{
              paddingVertical: space.md,
              marginBottom: -1,
              borderBottomWidth: 2,
              borderBottomColor: selected ? colors.primary : 'transparent',
            }}
          >
            <AppText variant="callout" tone={selected ? 'default' : 'secondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
