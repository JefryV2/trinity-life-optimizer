import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';

import { Icon, type IconName } from '@/components/ui/icon';
import { getBlurTarget, subscribeBlurTarget } from '@/lib/blur-target';
import { useTheme, type ThemeColors } from '@/theme';

enableFreeze(true);

type TabMeta = {
  label: string;
  icon: IconName;
  activeIcon: IconName;
  color: string;
};

type TabBarProps = {
  state: {
    index: number;
    routes: ReadonlyArray<{ key: string; name: string; params?: object }>;
  };
  emitter: {
    emit: (event: {
      type: 'tabPress' | 'tabLongPress';
      target: string;
      canPreventDefault?: boolean;
    }) => object;
  };
  navigateToTab: (routeKey: string) => void;
};

const metaFor = (route: string, colors: ThemeColors): TabMeta => {
  switch (route.split('/')[0]) {
    case 'index':
      return { label: 'Today', icon: 'home', activeIcon: 'homeFilled', color: colors.primary };
    case 'health':
      return { label: 'Health', icon: 'heart', activeIcon: 'heartFilled', color: colors.health };
    case 'wealth':
      return { label: 'Wealth', icon: 'wallet', activeIcon: 'walletFilled', color: colors.wealth };
    case 'relations':
      return { label: 'People', icon: 'people', activeIcon: 'peopleFilled', color: colors.bonds };
    default:
      return { label: 'You', icon: 'user', activeIcon: 'userFilled', color: colors.text };
  }
};

/**
 * A floating frosted dock. The bar samples the page underneath it with a native
 * blur, while the active tab is communicated only by its icon: filled, brighter
 * and in its pillar colour. No filled pill, no square.
 */
const AuxoTabBar = ({ state, emitter, navigateToTab }: TabBarProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(Math.max(width - 56, 256), 336);
  const target = useSyncExternalStore(
    subscribeBlurTarget,
    getBlurTarget,
    getBlurTarget,
  );
  const blurTarget = useMemo(() => ({ current: target }), [target]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(10, insets.bottom + 2),
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: barWidth,
          height: 64,
          borderRadius: 999,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.10)',
          backgroundColor: 'rgba(8, 8, 10, 0.22)',
        }}
      >
        <BlurView
          tint="systemThickMaterialDark"
          intensity={60}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            flex: 1,
            paddingHorizontal: 7,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = metaFor(route.name, colors);
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            }) as { defaultPrevented?: boolean };
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() =>
                emitter.emit({ type: 'tabLongPress', target: route.key })
              }
              style={({ pressed }) => ({
                flex: 1,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.72 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <Icon
                name={focused ? meta.activeIcon : meta.icon}
                size={focused ? 23 : 21}
                color={focused ? meta.color : colors.textTertiary}
              />
            </Pressable>
          );
        })}
        </View>
      </View>
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AuxoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="health" options={{ title: 'Health' }} />
      <Tabs.Screen name="wealth" options={{ title: 'Wealth' }} />
      <Tabs.Screen name="relations" options={{ title: 'People' }} />
      <Tabs.Screen name="more" options={{ title: 'You' }} />
    </Tabs>
  );
}
