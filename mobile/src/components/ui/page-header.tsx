import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

/**
 * Compact page header: one title, one date, one rule. The title shrinks before
 * the date ever truncates, and the whole row stays readable at large text.
 */
export const PageHeader = ({
  title,
  date,
  subtitle,
  rule = true,
}: {
  title: string;
  date?: string;
  subtitle?: string;
  rule?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
        <AppText
          variant="display"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ flex: 1, fontSize: 32, lineHeight: 36 }}
        >
          {title}
        </AppText>
        {date ? (
          <AppText
            variant="mono"
            tone="tertiary"
            numberOfLines={1}
            style={{ flexShrink: 0, textAlign: 'right' }}
          >
            {date}
          </AppText>
        ) : null}
      </View>
      {subtitle ? (
        <AppText variant="footnote" tone="secondary" style={{ maxWidth: 420 }}>
          {subtitle}
        </AppText>
      ) : null}
      {rule ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
    </View>
  );
};
