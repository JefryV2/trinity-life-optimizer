import {
  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/baloo-2';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CrashScreen } from '@/components/crash-screen';
import { ErrorBoundary } from '@/components/error-boundary';
import { installCrashGuard } from '@/lib/crash-guard';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { palette } from '@/theme';

installCrashGuard();
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
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

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  // if anything stalls (network, fonts, first paint), show the app anyway
  useEffect(() => {
    const t = setTimeout(() => void SplashScreen.hideAsync(), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const onAuthScreen = root === 'sign-in' || root === 'sign-up';
    const onOnboarding = root === 'onboarding';

    if (!session) {
      if (!onAuthScreen) router.replace('/sign-in');
      return;
    }

    if (!onboarded) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }

    if (onAuthScreen || onOnboarding || root === undefined) {
      router.replace('/(tabs)');
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
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign-up" options={{ animation: 'fade' }} />
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
        <Stack.Screen name="insights" options={{ headerShown: true, title: 'Insights' }} />
        <Stack.Screen name="calendar" options={{ headerShown: true, title: 'Progress calendar' }} />
        <Stack.Screen name="hydration" options={{ headerShown: true, title: 'Hydration' }} />
        <Stack.Screen name="walk" options={{ headerShown: true, title: 'Walk' }} />
        <Stack.Screen
          name="add/[form]"
          options={{ headerShown: false, presentation: 'formSheet', sheetGrabberVisible: true }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  // Never block the app on fonts: if they fail, render with the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
        <CrashScreen />
      </ErrorBoundary>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
