import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function ProfileLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
      <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
    </Stack>
  );
}