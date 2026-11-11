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
    <Screen contentContainerStyle={{ paddingTop: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="primary" style={{ letterSpacing: 1.2 }}>
          LOG
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={12}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={20} color={colors.textSecondary} />
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

      <Button label={submitLabel} loading={loading} disabled={disabled} onPress={onSubmit} />
    </Screen>
  );
};
