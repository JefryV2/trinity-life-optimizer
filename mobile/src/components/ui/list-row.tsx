import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { space, useTheme } from '@/theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
  chevron?: boolean;
}

/**
 * A ledger line. The icon shares one column, labels start on one line, the
 * value sits right, and the rule under the row is the only decoration.
 */
export const ListRow = ({
  title,
  subtitle,
  value,
  icon,
  onPress,
  destructive = false,
  last = false,
  chevron = true,
}: ListRowProps) => {
  const { colors } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        minHeight: 56,
      }}
    >
      {icon ? (
        <View style={{ width: 24, alignItems: 'center' }}>
          <Icon name={icon} size={18} color={destructive ? colors.danger : colors.textTertiary} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="callout" tone={destructive ? 'danger' : 'default'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="tertiary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="footnote" tone="secondary" selectable>
          {value}
        </AppText>
      ) : null}
      {onPress && chevron ? <Icon name="chevron" size={16} color={colors.textTertiary} /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator }}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.separator,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      {content}
    </Pressable>
  );
};
