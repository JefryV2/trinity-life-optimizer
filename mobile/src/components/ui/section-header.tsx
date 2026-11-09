import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

export const SectionHeader = ({
  title,
  caption,
  actionLabel,
  onAction,
}: {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: space.md,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline">{title}</AppText>
        {caption ? (
          <AppText variant="caption" tone="tertiary">
            {caption}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
};
