import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

/**
 * The signature: every tab screen opens with its name, the date set in mono on
 * the right, and a ruled line. The date is the entry, the screen is the page.
 */
export const PageHeader = ({
  title,
  date,
  subtitle,
}: {
  title: string;
  date?: string;
  subtitle?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
        <AppText variant="display" style={{ flex: 1, fontSize: 34, lineHeight: 38 }}>
          {title}
        </AppText>
        {date ? (
          <AppText variant="mono" tone="tertiary">
            {date}
          </AppText>
        ) : null}
      </View>
      {subtitle ? (
        <AppText variant="footnote" tone="secondary">
          {subtitle}
        </AppText>
      ) : null}
      <View style={{ height: 1, backgroundColor: colors.border }} />
    </View>
  );
};
