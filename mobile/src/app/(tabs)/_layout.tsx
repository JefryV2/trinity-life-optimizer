import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/theme';

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Icon name={name} size={size - 2} color={typeof color === 'string' ? color : '#8A8A92'} />
  );

/** A floating pill: inset from the edges, one soft highlight for the active tab. */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(14, insets.bottom + 6),
          height: 64,
          borderRadius: 999,
          backgroundColor: 'rgba(10, 10, 12, 0.94)',
          borderWidth: 1,
          borderColor: colors.border,
          borderTopWidth: 0,
          paddingHorizontal: 6,
          paddingTop: 4,
          paddingBottom: 4,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          fontFamily: 'Baloo2_600SemiBold',
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 1 },
        tabBarItemStyle: {
          borderRadius: 999,
          marginHorizontal: 2,
          paddingVertical: Platform.OS === 'android' ? 5 : 6,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'TODAY', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="health" options={{ title: 'HEALTH', tabBarIcon: tabIcon('heart') }} />
      <Tabs.Screen name="wealth" options={{ title: 'WEALTH', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen name="relations" options={{ title: 'BONDS', tabBarIcon: tabIcon('people') }} />
      <Tabs.Screen name="more" options={{ title: 'MORE', tabBarIcon: tabIcon('more') }} />
    </Tabs>
  );
}
