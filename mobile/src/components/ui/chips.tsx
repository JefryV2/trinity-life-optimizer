import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

interface ChipsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
}

export const Chips = <T extends string>({ options, value, onChange }: ChipsProps<T>) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
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
              style={{ color: selected ? colors.onPrimary : colors.textSecondary, fontWeight: '600' }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

interface MultiChipsProps {
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}

export const MultiChips = ({ options, values, onChange }: MultiChipsProps) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(
                selected
                  ? values.filter((value) => value !== option.value)
                  : [...values, option.value],
              );
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
              style={{ color: selected ? colors.onPrimary : colors.textSecondary, fontWeight: '600' }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};