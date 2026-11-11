import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

/**
 * A section head is a numbered entry on a ruled line: `01  NUMBERS ───────  ADD`.
 * The rule runs to the edge, so sections read as a sequence rather than cards.
 */
export const SectionHeader = ({
  index,
  title,
  caption,
  actionLabel,
  onAction,
}: {
  index?: string;
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm - 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {index ? (
          <AppText variant="caption" tone="primary">
            {index}
          </AppText>
        ) : null}
        <AppText variant="headline">{title}</AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            hitSlop={10}
            style={{ minHeight: 28, justifyContent: 'center' }}
          >
            <AppText variant="caption" tone="primary">
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {caption ? (
        <AppText variant="footnote" tone="tertiary">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
};
