import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

export const Stat = ({
  value,
  label,
  prefix,
  suffix,
  tone = 'default',
}: {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
}) => {
  const { colors } = useTheme();
  const toneColor = {
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
          style={{ color: toneColor, fontSize: 26, lineHeight: 30 }}
        >
          {value}
        </AppText>
        {suffix ? (
          <AppText variant="caption" style={{ color: toneColor }}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" tone="tertiary">
        {label}
      </AppText>
    </View>
  );
};

export const StatRow = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: space.lg }}>{children}</View>
);
