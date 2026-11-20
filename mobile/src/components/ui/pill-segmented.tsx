import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { fonts, radius, useTheme } from '@/theme';

/** A full-width pill track; the selected option is the only bright surface. */
export const PillSegmented = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: 2,
        padding: 4,
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
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 6,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <AppText
              variant="callout"
              numberOfLines={1}
              style={{
                fontFamily: selected ? fonts.bold : fonts.medium,
                color: selected ? colors.onPrimary : colors.textSecondary,
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};
