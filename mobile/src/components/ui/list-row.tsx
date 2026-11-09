import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { radius, space, useTheme } from '@/theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}

export const ListRow = ({
  title,
  subtitle,
  value,
  icon,
  onPress,
  destructive = false,
  last = false,
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
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.small,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={17} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="callout" tone={destructive ? 'danger' : 'default'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="tertiary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="footnote" tone="secondary" selectable>
          {value}
        </AppText>
      ) : null}
      {onPress ? <Icon name="chevron" size={14} color={colors.textTertiary} /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View
        style={{
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.separator,
        }}
      >
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
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {content}
    </Pressable>
  );
};
