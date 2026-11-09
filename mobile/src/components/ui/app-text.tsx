import { Text, type TextProps } from 'react-native';

import { type, useTheme } from '@/theme';

type Variant = keyof typeof type;
type Tone = 'default' | 'secondary' | 'tertiary' | 'primary' | 'danger' | 'success' | 'onPrimary';

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

export const AppText = ({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: AppTextProps) => {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    default: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
    onPrimary: colors.onPrimary,
  };

  return <Text {...rest} style={[type[variant], { color: toneColor[tone] }, style]} />;
};
