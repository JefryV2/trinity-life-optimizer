import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

/**
 * A section head: title, rule, optional action. No decorative numbering —
 * sections are a document, not a sequence of steps.
 */
export const SectionHeader = ({
  title,
  caption,
  actionLabel,
  actionNode,
  onAction,
}: {
  /** Kept for call-site compatibility; numbering is intentionally not rendered. */
  index?: string;
  title: string;
  caption?: string;
  actionLabel?: string;
  actionNode?: React.ReactNode;
  onAction?: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm - 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="headline">{title}</AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
        {actionNode ?? (actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            hitSlop={12}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <AppText variant="caption" tone="primary">
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null)}
      </View>
      {caption ? (
        <AppText variant="footnote" tone="tertiary">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
};
