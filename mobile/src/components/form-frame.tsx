import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { radius, space, useTheme } from '@/theme';

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
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? (
            <AppText variant="footnote" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Icon name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {children}

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <Button label={submitLabel} loading={loading} disabled={disabled} onPress={onSubmit} />
    </Screen>
  );
};