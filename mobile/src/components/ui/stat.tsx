import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

/**
 * A figure and its label, nothing else. Colour is only used when the number
 * itself carries meaning (over target, out of range).
 */
export const Stat = ({
  value,
  label,
  prefix,
  suffix,
  tone = 'default',
  color,
}: {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
  color?: string;
}) => {
  const { colors } = useTheme();
  const toneColor =
    color ??
    {
      default: colors.text,
      primary: colors.primary,
      success: colors.success,
      danger: colors.danger,
    }[tone];

  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        {prefix ? (
          <AppText variant="callout" style={{ color: toneColor }}>
            {prefix}
          </AppText>
        ) : null}
        <AppText
          variant="numeric"
          selectable
          style={{ color: toneColor, fontSize: 28, lineHeight: 32 }}
        >
          {value}
        </AppText>
        {suffix ? (
          <AppText variant="footnote" style={{ color: toneColor }}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      <AppText variant="footnote" tone="secondary">
        {label}
      </AppText>
    </View>
  );
};

export const StatRow = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: space.lg }}>{children}</View>
);
