import {
  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/baloo-2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CrashScreen } from '@/components/crash-screen';
import { ArrivalOverlay } from '@/features/landing/arrival-overlay';
import { ErrorBoundary } from '@/components/error-boundary';
import { ToastHost } from '@/components/ui/toast';
import { installCrashGuard } from '@/lib/crash-guard';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { palette } from '@/theme';
import '@/features/health/walk-task';

installCrashGuard();
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: 0,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'auxo.query.cache.v1',
});

const navigationTheme = (_dark: boolean) => {
  const base = DarkTheme;
  const colors = palette.dark;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.separator,
      notification: colors.primary,
    },
  };
};

function RootNavigator() {
  const { session, loading, onboarded } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const dark = true;
  const colors = palette.dark;

  // The landing owns the boot animation; don't leave the native splash
  // (a still logo) sitting on top of it.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  // if anything stalls (network, fonts, first paint), show the app anyway
  useEffect(() => {
    const t = setTimeout(() => void SplashScreen.hideAsync(), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading) return;

    const root = segments[0] as string | undefined;
    const onAuthScreen =
      root === 'welcome' ||
      root === 'sign-in' ||
      root === 'sign-up' ||
      root === 'reset' ||
      root === 'oauth';
    const onOnboarding = root === 'onboarding';

    if (!session) {
      // Onboarding is the front door now. Sign-up happens at the end, once the
      // user has seen their three rings and has a reason to keep them.
      if (!onAuthScreen && !onOnboarding) router.replace('/welcome' as never);
      return;
    }

    if (!onboarded) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }

    if (onAuthScreen || onOnboarding || root === undefined) {
      // A reset ticket may arrive while a session is still cached.
      if (root !== 'reset') router.replace('/(tabs)');
    }
  }, [session, loading, onboarded, segments, router]);

  return (
    <ThemeProvider value={navigationTheme(dark)}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textSecondary,
          headerTitleStyle: { color: colors.text, fontFamily: 'Baloo2_700Bold', fontSize: 18 },
          headerBackTitleStyle: { fontFamily: 'Baloo2_600SemiBold' },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign-up" options={{ animation: 'fade' }} />
        <Stack.Screen name="reset" options={{ animation: 'fade' }} />
        <Stack.Screen name="oauth" options={{ animation: 'fade' }} />
        <Stack.Screen name="account/password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen name="why" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="experiments" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="insights" options={{ headerShown: false }} />
        <Stack.Screen name="weekly-review" options={{ headerShown: false }} />
        <Stack.Screen name="data-privacy" options={{ headerShown: false }} />
        <Stack.Screen name="reminders" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="scan-food" options={{ headerShown: false }} />
        <Stack.Screen name="food-search" options={{ headerShown: false }} />
        <Stack.Screen name="meal-builder" options={{ headerShown: false }} />
        <Stack.Screen name="meal-photo" options={{ headerShown: false }} />
        <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="health-import" options={{ headerShown: false }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="calendar" options={{ headerShown: false }} />
        <Stack.Screen name="hydration" options={{ headerShown: false }} />
        <Stack.Screen name="walk" options={{ headerShown: false }} />
        <Stack.Screen name="walk-detail" options={{ headerShown: false }} />
        <Stack.Screen name="call-import" options={{ headerShown: false }} />
        <Stack.Screen
          name="add/[form]"
          options={{ headerShown: false, presentation: 'formSheet', sheetGrabberVisible: true }}
        />
      </Stack>
      <ToastHost />
      <ArrivalOverlay />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Load the family in the background. The first screen is the canvas
  // animation, which has its own embedded font, so boot never waits on this.
  useFonts({
    Baloo2_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 24 * 60 * 60_000 }}
        >
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PersistQueryClientProvider>
        <CrashScreen />
      </ErrorBoundary>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
