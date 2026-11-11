import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { fonts, space, useTheme } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helper?: string;
}

/**
 * A boxless field. No container, no fill — just a label and a rule the value
 * sits on, so a form reads as one flowing page instead of a stack of boxes.
 */
export const TextField = ({ label, error, helper, style, ...rest }: TextFieldProps) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecret = Boolean(rest.secureTextEntry);
  const multiline = Boolean(rest.multiline);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </AppText>
      ) : null}
      <View style={{ position: 'relative' }}>
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
          placeholderTextColor={colors.textFaint}
          secureTextEntry={isSecret && !revealed}
          style={[
            {
              minHeight: 46,
              backgroundColor: 'transparent',
              borderBottomWidth: 1,
              borderBottomColor: error ? colors.danger : focused ? colors.primary : colors.border,
              paddingHorizontal: 0,
              paddingTop: 4,
              paddingBottom: 10,
              paddingRight: isSecret ? 64 : 0,
              color: colors.text,
              fontFamily: fonts.medium,
              fontSize: 19,
              letterSpacing: -0.3,
            },
            multiline && { minHeight: 92, textAlignVertical: 'top' },
            style,
          ]}
        />
        {isSecret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((value) => !value)}
            hitSlop={10}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' }}
          >
            <AppText variant="caption" tone="tertiary">
              {revealed ? 'HIDE' : 'SHOW'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="footnote" tone="tertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
};
