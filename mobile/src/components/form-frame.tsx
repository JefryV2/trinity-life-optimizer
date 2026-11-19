import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { space, useTheme } from '@/theme';

interface FormFrameProps {
  title: string;
  subtitle?: string;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  onSubmit: () => void;
  children: React.ReactNode;
}

/**
 * A logging surface. The title is the page, the fields flow straight down it,
 * and the only "control" is the pill at the end. Nothing is boxed in.
 */
export const FormFrame = ({
  title,
  subtitle,
  submitLabel = 'Save',
  loading = false,
  disabled = false,
  error,
  onSubmit,
  children,
}: FormFrameProps) => {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Screen contentContainerStyle={{ paddingTop: space.lg, flexGrow: 1 }}>
      <View
        style={{
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginTop: -space.sm,
          marginBottom: space.sm,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="primary" style={{ letterSpacing: 1.2 }}>
          LOG
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={21} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ gap: 6 }}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="callout" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: space.xl }}>{children}</View>

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <View style={{ marginTop: 'auto', paddingTop: space.xl }}>
        <Button label={submitLabel} loading={loading} disabled={disabled} onPress={onSubmit} />
      </View>
    </Screen>
  );
};
