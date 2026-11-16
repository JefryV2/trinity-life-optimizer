import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { palette, type } from '@/theme';

type Variant = keyof typeof type;
type Tone = 'default' | 'secondary' | 'tertiary' | 'faint' | 'primary' | 'danger' | 'success' | 'onPrimary';

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

/**
 * One type ramp everywhere. The base sizes are deliberately a touch larger
 * than the first pass: on a phone, 15px Baloo reads smaller than 15px of a
 * conventional UI face, and captions need the extra point too.
 */
const TEXT_SCALE = 1.12;

const TONE_COLOR: Record<Tone, string> = {
  default: palette.dark.text,
  secondary: palette.dark.textSecondary,
  tertiary: palette.dark.textTertiary,
  faint: palette.dark.textFaint,
  primary: palette.dark.primary,
  danger: palette.dark.danger,
  success: palette.dark.success,
  onPrimary: palette.dark.onPrimary,
};

export const AppText = ({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: AppTextProps) => {

  const flattened = (StyleSheet.flatten([type[variant], style]) ?? {}) as TextStyle;
  const size = typeof flattened.fontSize === 'number' ? flattened.fontSize : undefined;
  const line = typeof flattened.lineHeight === 'number' ? flattened.lineHeight : undefined;

  return (
    <Text
      {...rest}
      style={[
        flattened,
        size ? { fontSize: size * TEXT_SCALE } : null,
        line ? { lineHeight: line * TEXT_SCALE } : null,
        { color: flattened.color ?? TONE_COLOR[tone] },
      ]}
    />
  );
};
