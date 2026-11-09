import * as Haptics from 'expo-haptics';
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
    secondary: colors.surfaceAlt,
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

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(event) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }}
      style={({ pressed }): ViewStyle => ({
        minHeight: size === 'small' ? 40 : 48,
        paddingHorizontal: size === 'small' ? space.md : space.lg,
        borderRadius: size === 'small' ? radius.small : radius.inner,
        borderCurve: 'continuous',
        backgroundColor: background[variant],
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: space.sm,
        opacity: isDisabled ? 0.45 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground[variant]} />
      ) : (
        <>
          {icon}
          <AppText
            variant="callout"
            style={{ color: foreground[variant], fontWeight: '600' }}
          >
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
};
