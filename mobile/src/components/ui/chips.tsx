import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

interface ChipsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
}

const chipStyle = (selected: boolean, colors: ReturnType<typeof useTheme>['colors']) => ({
  minHeight: 34,
  paddingHorizontal: 2,
  marginRight: space.lg,
  borderBottomWidth: 2,
  borderBottomColor: selected ? colors.primary : 'transparent',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

export const Chips = <T extends string>({ options, value, onChange, label }: ChipsProps<T>) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(option.value);
              }}
              style={({ pressed }) => [chipStyle(selected, colors), { opacity: pressed ? 0.7 : 1 }]}
            >
              <AppText variant="footnote" tone={selected ? 'primary' : 'secondary'}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

interface MultiChipsProps {
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
}

export const MultiChips = ({ options, values, onChange, label }: MultiChipsProps) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                onChange(
                  selected
                    ? values.filter((value) => value !== option.value)
                    : [...values, option.value],
                );
              }}
              style={({ pressed }) => [chipStyle(selected, colors), { opacity: pressed ? 0.7 : 1 }]}
            >
              <AppText variant="footnote" tone={selected ? 'primary' : 'secondary'}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
