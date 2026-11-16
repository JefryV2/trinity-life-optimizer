import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/theme';

/** One back affordance: the same chevron, the same 44px target, everywhere. */
export const BackLink = ({ fallback = '/welcome', label = 'Back' }: { fallback?: string; label?: string }) => {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback as never);
      }}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Icon name="back" size={16} color={colors.textTertiary} />
      <AppText variant="footnote" tone="tertiary">
        {label}
      </AppText>
    </Pressable>
  );
};
