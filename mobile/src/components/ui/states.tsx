import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { radius, space, useTheme } from '@/theme';

export const EmptyState = ({
  icon = 'sparkles',
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
    <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.section }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.pill,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={22} color={colors.primary} />
      </View>
      <AppText variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="footnote" tone="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="small" variant="soft" />
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
        <Icon name="bell" size={18} color={colors.danger} />
        <AppText variant="headline">Could not load</AppText>
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
    <View style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <ActivityIndicator color={colors.primary} />
        <AppText variant="footnote" tone="secondary">
          Reading your records…
        </AppText>
      </View>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={{
            height: 92,
            borderRadius: radius.card,
            backgroundColor: colors.surfaceAlt,
            opacity: 0.7 - index * 0.15,
          }}
        />
      ))}
    </View>
  );
};
