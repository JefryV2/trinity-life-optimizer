import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helper?: string;
}

export const TextField = ({ label, error, helper, style, ...rest }: TextFieldProps) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: space.sm }}>
      {label ? (
        <AppText variant="caption" tone="secondary">
          {label}
        </AppText>
      ) : null}
      <TextInput
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        placeholderTextColor={colors.textTertiary}
        style={[
          {
            minHeight: 48,
            borderRadius: radius.small,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            backgroundColor: colors.surfaceAlt,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            color: colors.text,
            fontSize: 16,
          },
          rest.multiline && { minHeight: 104, textAlignVertical: 'top' },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger" selectable>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="tertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
};
