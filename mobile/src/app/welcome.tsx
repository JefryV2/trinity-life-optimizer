import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/reveal';
import { LandingAnimation } from '@/features/landing/landing-animation';
import { useAuth } from '@/providers/auth-provider';
import { space, useTheme } from '@/theme';

/**
 * The first screen. The wordmark animation is the feature, not decoration:
 * four dots gather, line up and become the name, then the camera pulls in on
 * the anchor points that construct each letter.
 */
export default function Welcome() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, loading, onboarded, enterDemo } = useAuth();
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  if (!loading && session) {
    return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
  }

  const startDemo = async () => {
    setDemoError(null);
    setDemoLoading(true);
    try {
      await enterDemo();
    } catch (caught) {
      setDemoError(caught instanceof Error ? caught.message : 'Could not start the demo.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.xxl,
          paddingTop: space.section,
          paddingBottom: space.xxl,
          gap: space.xl,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <LandingAnimation active={focused} />

        <Reveal delay={100}>
          <AppText variant="headline" style={{ maxWidth: 340 }}>
            Grow the three things that compound — your body, your money, your people.
          </AppText>
        </Reveal>

        <Reveal delay={220}>
          <View style={{ gap: space.md }}>
            <Button label="Get started" onPress={() => router.push('/onboarding')} />
            <Button
              label="I already have an account"
              variant="secondary"
              onPress={() => router.push('/sign-in')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: demoLoading, busy: demoLoading }}
              disabled={demoLoading}
              hitSlop={8}
              onPress={() => void startDemo()}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <AppText variant="footnote" tone="tertiary">
                {demoLoading ? 'Preparing the demo…' : 'Explore the demo first'}
              </AppText>
              {demoLoading ? null : (
                <Icon name="chevron" size={13} color={colors.textTertiary} />
              )}
            </Pressable>
            {demoError ? (
              <AppText variant="footnote" tone="danger" style={{ textAlign: 'center' }}>
                {demoError}
              </AppText>
            ) : null}
          </View>
        </Reveal>

        <Reveal delay={300}>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.separator,
              paddingTop: space.md,
            }}
          >
            <AppText variant="caption" tone="tertiary">
              Private by default. No ads, no feed.
            </AppText>
          </View>
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}
