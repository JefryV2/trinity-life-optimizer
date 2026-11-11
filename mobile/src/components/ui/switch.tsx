import { Pressable, View } from 'react-native';

import { radius, useTheme } from '@/theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const Switch = ({ value, onValueChange, disabled = false, accessibilityLabel }: SwitchProps) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        onValueChange(!value);
      }}
      style={({ pressed }) => ({
        width: 52,
        height: 32,
        borderRadius: radius.pill,
        padding: 3,
        justifyContent: 'center',
        backgroundColor: value ? colors.text : colors.surfaceSunken,
        opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
      })}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.pill,
          backgroundColor: value ? colors.onPrimary : colors.surface,
          transform: [{ translateX: value ? 20 : 0 }],
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </Pressable>
  );
};