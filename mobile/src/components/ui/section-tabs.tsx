import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

interface SectionTabsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** Used by screen readers: "Health section". */
  label: string;
}

/**
 * A visible index of sections, not a dropdown and not a clipped rail.
 * Every destination is on screen; the active one gets the one accent.
 */
export const SectionTabs = <T extends string>({
  options,
  value,
  onChange,
  label,
}: SectionTabsProps<T>) => {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
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
            style={{
              minHeight: 40,
              justifyContent: 'center',
              paddingTop: space.xs,
              marginRight: space.xs,
            }}
          >
            <AppText variant="footnote" tone={selected ? 'default' : 'tertiary'} style={{ fontSize: 13 }}>
              {option.label}
            </AppText>
            <View
              style={{
                height: 2,
                marginTop: 6,
                borderRadius: 1,
                backgroundColor: selected ? colors.primary : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
};
