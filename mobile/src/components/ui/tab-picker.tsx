import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { space, useTheme } from '@/theme';

interface TabPickerProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  title?: string;
}

/**
 * The section switcher for hubs with too many tabs to fit. It replaces the
 * clipped horizontal rail: one full-width row, one sheet, no half labels.
 */
export const TabPicker = <T extends string>({
  options,
  value,
  onChange,
  title = 'Choose section',
}: TabPickerProps<T>) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const active = options.find((option) => option.value === value) ?? options[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Section: ${active?.label ?? ''}`}
        accessibilityHint="Opens the section picker"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <AppText variant="headline">{active?.label ?? ''}</AppText>
        <View style={{ transform: [{ rotate: '90deg' }] }}>
          <Icon name="chevron" size={14} color={colors.textTertiary} />
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
      </Pressable>

      <Sheet compact visible={open} title={title} onClose={() => setOpen(false)}>
        <View>
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.separator,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <AppText
                  variant="callout"
                  tone={selected ? 'default' : 'secondary'}
                  style={{ flex: 1 }}
                >
                  {option.label}
                </AppText>
                {selected ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
};
