import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { AUXO_MOMENT_HTML } from '@/features/landing/auxo-animation';
import { LandingAnimation } from '@/features/landing/landing-animation';
import { space, useTheme } from '@/theme';

/**
 * The arrival artwork itself. The overlay that owns its lifecycle lives at the
 * root, so this can keep playing after onboarding is replaced by the dashboard.
 */
export const BrandMoment = ({ onDone }: { onDone?: () => void }) => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.xxl,
          gap: space.lg,
        }}
      >
        <View style={{ width: '100%', maxWidth: 340 }}>
          <LandingAnimation html={AUXO_MOMENT_HTML} onDone={onDone} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          />
          <AppText variant="callout" tone="secondary">
            Building your baseline
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
};
