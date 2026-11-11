import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { radius, space, useTheme } from '@/theme';

export const EmptyState = ({
  icon = 'note',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: space.md, paddingVertical: space.section }}>
      <Icon name={icon} size={22} color={colors.textTertiary} />
      <AppText variant="headline">{title}</AppText>
      <AppText variant="footnote" tone="secondary" style={{ maxWidth: 300 }}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="small" variant="secondary" />
      ) : null}
    </Card>
  );
};

export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="warning" size={18} color={colors.danger} />
        <AppText variant="headline">Couldn't load</AppText>
      </View>
      <AppText variant="footnote" tone="secondary" selectable>
        {message}
      </AppText>
      {onRetry ? (
        <Button label="Try again" variant="secondary" size="small" onPress={onRetry} />
      ) : null}
    </Card>
  );
};

export const LoadingState = ({ rows = 3 }: { rows?: number }) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
        <AppText variant="footnote" tone="tertiary">
          Loading
        </AppText>
      </View>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={{
            height: 64,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: colors.separator,
            backgroundColor: colors.surfaceAlt,
            opacity: 0.8 - index * 0.15,
          }}
        />
      ))}
    </View>
  );
};
