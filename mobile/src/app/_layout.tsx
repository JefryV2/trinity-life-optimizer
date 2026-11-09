import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { palette } from '@/theme';

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

const navigationTheme = (dark: boolean) => {
  const base = dark ? DarkTheme : DefaultTheme;
  const colors = dark ? palette.dark : palette.light;
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
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const colors = dark ? palette.dark : palette.light;

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const onAuthScreen = root === 'sign-in' || root === 'sign-up';
    const onOnboarding = root === 'onboarding';

    if (!session) {
      if (!onAuthScreen) router.replace('/sign-in');
      return;
    }

    const onboarded = session.user.user_metadata?.onboarding_completed === true;
    if (!onboarded) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }

    if (onAuthScreen || onOnboarding || root === undefined) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

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
        <Stack.Screen name="insights" options={{ headerShown: true, title: 'Insights' }} />
        <Stack.Screen name="calendar" options={{ headerShown: true, title: 'Progress calendar' }} />
        <Stack.Screen name="hydration" options={{ headerShown: true, title: 'Hydration' }} />
        <Stack.Screen
          name="add/[form]"
          options={{ headerShown: false, presentation: 'formSheet', sheetGrabberVisible: true }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
