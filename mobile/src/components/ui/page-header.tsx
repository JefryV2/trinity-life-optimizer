import { useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackButton } from '@/components/ui/detail-header';
import { space, useTheme } from '@/theme';

/**
 * Compact page header: one title, one date, one rule. The title shrinks before
 * the date ever truncates, and the whole row stays readable at large text.
 */
export const PageHeader = ({
  title,
  date,
  subtitle,
  rule = false,
  back,
}: {
  title: string;
  date?: string;
  subtitle?: string;
  rule?: boolean;
  /** Pass a fallback route to put the shared back button inline with the title. */
  back?: string;
}) => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  // At larger text sizes the date moves under the title instead of squeezing
  // the title into an ellipsis.
  const stackDate = Boolean(date) && fontScale > 1.15;
  return (
    <View style={{ gap: space.sm }}>
      {back ? (
        <View
          style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.md,
          }}
        >
          <BackButton fallback={back} />
          {date ? (
            <AppText variant="mono" tone="tertiary" numberOfLines={1}>
              {date}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: stackDate ? 2 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
          <AppText
            variant="display"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ flex: 1, fontSize: 32, lineHeight: 36 }}
          >
            {title}
          </AppText>
          {!back && date && !stackDate ? (
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
        {!back && date && stackDate ? (
          <AppText variant="mono" tone="tertiary" numberOfLines={1}>
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
