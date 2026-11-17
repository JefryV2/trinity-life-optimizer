import { useWindowDimensions, Pressable, View } from 'react-native';

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
 * A mobile index of sections. One row when it fits; at larger text sizes it
 * becomes a balanced, centred grid instead of wrapping into a ragged line.
 */
export const SectionTabs = <T extends string>({
  options,
  value,
  onChange,
  label,
}: SectionTabsProps<T>) => {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const oneRow = fontScale <= 1 && width >= 405;
  const columns = oneRow ? options.length : fontScale > 1.7 ? 2 : fontScale > 1.5 ? 3 : 4;

  const rows: Array<Array<{ value: T; label: string }>> = [];
  for (let index = 0; index < options.length; index += columns) {
    rows.push(options.slice(index, index + columns));
  }

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
        paddingBottom: 2,
      }}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: 'row',
            justifyContent: columns === options.length ? 'flex-start' : 'center',
            flexWrap: 'nowrap',
          }}
        >
          {row.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => onChange(option.value)}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 0,
                  marginRight: columns === options.length ? space.sm : space.md,
                }}
              >
                <AppText
                  variant="footnote"
                  tone={selected ? 'default' : 'tertiary'}
                  numberOfLines={1}
                  style={{ fontSize: columns === options.length ? 12.8 : 13 }}
                >
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
      ))}
    </View>
  );
};
