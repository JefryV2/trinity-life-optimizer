import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { radius, useTheme } from '@/theme';

export interface LogAction {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  loading?: boolean;
}

/** Four log actions on one ruled strip: a ledger row you can tap. */
export const LogStrip = ({ items }: { items: LogAction[] }) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: colors.surface,
      }}
    >
      {items.map((item, index) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityState={{ busy: item.loading, disabled: item.loading }}
          onPress={item.onPress}
          disabled={item.loading}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 64,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderLeftWidth: index === 0 ? 0 : 1,
            borderLeftColor: colors.separator,
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            opacity: item.loading ? 0.5 : 1,
          })}
        >
          <Icon
            name={item.icon}
            size={18}
            color={item.primary ? colors.primary : colors.textSecondary}
          />
          <AppText variant="footnote" tone={item.primary ? 'primary' : 'secondary'}>
            {item.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
};
