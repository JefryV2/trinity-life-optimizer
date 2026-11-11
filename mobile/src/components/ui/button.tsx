import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  size?: 'default' | 'small';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = ({
  label,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  icon,
  onPress,
  ...rest
}: ButtonProps) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const background: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.surface,
    soft: colors.primarySoft,
    ghost: 'transparent',
    danger: colors.danger,
  };
  const foreground: Record<Variant, string> = {
    primary: colors.onPrimary,
    secondary: colors.text,
    soft: colors.primary,
    ghost: colors.textSecondary,
    danger: '#FFFFFF',
  };
  const filled = variant === 'primary' || variant === 'soft' || variant === 'danger';
  const backgroundColor = isDisabled && filled ? colors.surfaceSunken : background[variant];
  const textColor = isDisabled && filled ? colors.textTertiary : foreground[variant];

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(event) => {
        onPress?.(event);
      }}
      style={({ pressed }): ViewStyle => ({
        minHeight: size === 'small' ? 36 : 48,
        paddingHorizontal: size === 'small' ? space.md : space.lg,
        borderRadius: radius.pill,
        borderCurve: 'continuous',
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: colors.border,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: space.sm,
        opacity: isDisabled ? 1 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <AppText variant="callout" style={{ color: textColor, fontWeight: '800' }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
};
