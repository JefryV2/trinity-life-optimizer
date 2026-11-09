import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/theme';

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Icon name={name} size={size - 2} color={typeof color === 'string' ? color : '#9A8F82'} />
  );

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.separator,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: {
          paddingVertical: Platform.OS === 'android' ? 4 : 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="health" options={{ title: 'Health', tabBarIcon: tabIcon('heart') }} />
      <Tabs.Screen name="wealth" options={{ title: 'Wealth', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen
        name="relations"
        options={{ title: 'Relations', tabBarIcon: tabIcon('people') }}
      />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('more') }} />
    </Tabs>
  );
}