import { BlurView } from 'expo-blur';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSectionNav } from '@/features/navigation/section-nav';
import { useProfile } from '@/features/profile/use-profile';
import { getBlurTarget, isBlurTargetAlive, subscribeBlurTarget } from '@/lib/blur-target';
import {
  healthSections,
  WEALTH_SECTIONS,
  type HealthTab,
  type WealthTab,
} from '@/lib/navigation';
import { useTheme, type ThemeColors } from '@/theme';

type Route = { key: string; name: string; params?: object };

type DockProps = {
  state: { index: number; routes: ReadonlyArray<Route> };
  emitter: {
    emit: (event: {
      type: 'tabPress' | 'tabLongPress';
      target: string;
      canPreventDefault?: boolean;
    }) => object;
  };
  navigateToTab: (routeKey: string) => void;
  quickLogOpen: boolean;
  onQuickLog: () => void;
};

type Meta = { label: string; icon: IconName; activeIcon: IconName; color: string };

const baseName = (route: string) => route.split('/')[0];

const metaFor = (route: string, colors: ThemeColors): Meta => {
  switch (baseName(route)) {
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

const SECTION_ICON: Record<string, IconName> = {
  overview: 'chart',
  nutrition: 'food',
  fitness: 'dumbbell',
  sleep: 'moon',
  mental: 'brain',
  heart: 'heart',
  women: 'female',
  investments: 'arrowUp',
  expenses: 'wallet',
  goals: 'target',
};

const POPUP_WIDTH = 264;
const POPUP_GAP = 10;
const BAR_HEIGHT = 64;

/**
 * One dock for the whole app. The five destinations always stay visible; the
 * active one opens into a labelled pill, and a pillar's pages live in a
 * pop-up above it. The bar itself never turns into a second navigation layer.
 */
export const UnifiedDock = ({
  state,
  emitter,
  navigateToTab,
  quickLogOpen,
  onQuickLog,
}: DockProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const { data: profileData } = useProfile();
  const { health, wealth, setHealth, setWealth } = useSectionNav();

  const [popupOpen, setPopupOpen] = useState(false);
  const [tabLayout, setTabLayout] = useState<{ x: number; width: number } | null>(null);
  const popupAnim = useRef(new Animated.Value(0)).current;

  const routeName = baseName(state.routes[state.index]?.name ?? 'index');
  const sectionMode = routeName === 'health' || routeName === 'wealth';
  const female = profileData?.health?.gender === 'female';
  const options = (
    routeName === 'health' ? healthSections(female) : WEALTH_SECTIONS
  ) as Array<{ value: string; label: string }>;
  const active =
    routeName === 'health'
      ? health === 'women' && !female
        ? 'overview'
        : health
      : wealth;
  const activeMeta = metaFor(routeName, colors);
  const hasSections = sectionMode && options.length > 0;

  const barWidth = Math.min(width - 32, 380);
  const innerWidth = barWidth - 28;
  const activeWidth =
    barWidth >= 360
      ? fontScale > 1.15
        ? 150
        : 142
      : barWidth >= 330
        ? fontScale > 1.15
          ? 132
          : 124
        : 104;
  const activeRouteKey = state.routes[state.index]?.key;
  const visibleRoutes = state.routes.filter(
    (route) => baseName(route.name) !== 'more' || route.key === activeRouteKey,
  );
  const hasVisibleActive = visibleRoutes.some((route) => route.key === activeRouteKey);
  const inactiveWidth = Math.max(
    24,
    (innerWidth - activeWidth - 36 - 20) / Math.max(1, visibleRoutes.length - 1),
  );
  const quietWidth = Math.max(
    36,
    (innerWidth - 36 - 4 * visibleRoutes.length) / Math.max(1, visibleRoutes.length),
  );
  const barBottom = Math.max(10, insets.bottom + 2);
  const popupLeft = (() => {
    if (!tabLayout) return (width - POPUP_WIDTH) / 2;
    const barLeft = (width - barWidth) / 2;
    const center = barLeft + 8 + tabLayout.x + tabLayout.width / 2;
    return Math.min(Math.max(center - POPUP_WIDTH / 2, 12), width - POPUP_WIDTH - 12);
  })();
  const tailLeft = (() => {
    if (!tabLayout) return POPUP_WIDTH / 2 - 7;
    const barLeft = (width - barWidth) / 2;
    const center = barLeft + 8 + tabLayout.x + tabLayout.width / 2;
    return Math.min(Math.max(center - popupLeft - 7, 14), POPUP_WIDTH - 28);
  })();

  const target = useSyncExternalStore(subscribeBlurTarget, getBlurTarget, getBlurTarget);
  const blurTargetAlive = useMemo(() => isBlurTargetAlive(target), [target, fontScale]);
  const blurTarget = useMemo(() => ({ current: target }), [target]);

  useEffect(() => {
    setPopupOpen(false);
    setTabLayout(null);
  }, [routeName]);

  useEffect(() => {
    if (!popupOpen) return;
    popupAnim.setValue(0);
    Animated.timing(popupAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [popupOpen, popupAnim]);

  useEffect(() => {
    if (!popupOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setPopupOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [popupOpen]);

  useEffect(() => {
    if (quickLogOpen) setPopupOpen(false);
  }, [quickLogOpen]);

  const choose = (value: string) => {
    if (routeName === 'health') setHealth(value as HealthTab);
    else setWealth(value as WealthTab);
    setPopupOpen(false);
  };

  const pressTab = (route: Route, focused: boolean) => {
    if (focused) {
      if (hasSections) setPopupOpen((open) => !open);
      return;
    }
    setPopupOpen(false);
    const event = emitter.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    }) as { defaultPrevented?: boolean };
    if (!event.defaultPrevented) navigateToTab(route.key);
  };

  const quickLog = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={quickLogOpen ? 'Close quick log' : 'Quick log'}
      accessibilityHint={quickLogOpen ? 'Closes quick log actions' : 'Opens quick log actions'}
      onPress={onQuickLog}
      style={({ pressed }) => ({
        width: 36,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={quickLogOpen ? 'close' : 'plus'} size={19} color={colors.onPrimary} />
      </View>
    </Pressable>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: barBottom,
        alignItems: 'center',
      }}
    >
      {popupOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={() => setPopupOpen(false)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: BAR_HEIGHT,
            height,
            backgroundColor: 'rgba(0, 0, 0, 0.58)',
            zIndex: 10,
          }}
        />
      ) : null}

      {popupOpen ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: popupLeft,
            bottom: BAR_HEIGHT + POPUP_GAP,
            width: POPUP_WIDTH,
            zIndex: 20,
            opacity: popupAnim,
            transform: [
              {
                translateY: popupAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                scale: popupAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          }}
        >
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.separator,
              borderRadius: 22,
              padding: 8,
            }}
          >
            <View style={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 4 }}>
              <AppText
                variant="caption"
                tone="tertiary"
                style={{ letterSpacing: 0.7, textTransform: 'uppercase' }}
              >
                {activeMeta.label}
              </AppText>
            </View>

            {options.map((option) => {
              const selected = option.value === active;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => choose(option.value)}
                  style={({ pressed }) => ({
                    height: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 10,
                    borderRadius: 16,
                    backgroundColor: selected ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.primary : 'rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <Icon
                      name={SECTION_ICON[option.value] ?? 'chart'}
                      size={18}
                      color={selected ? colors.onPrimary : colors.textSecondary}
                    />
                  </View>
                  <AppText
                    variant="callout"
                    style={{ flex: 1, color: selected ? colors.text : colors.textSecondary }}
                  >
                    {option.label}
                  </AppText>
                  {selected ? <Icon name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: tailLeft,
              bottom: -7,
              width: 14,
              height: 14,
              backgroundColor: colors.surfaceAlt,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.separator,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </Animated.View>
      ) : null}

      <View style={{ width: barWidth, height: BAR_HEIGHT, zIndex: 30 }}>
        <View
          style={{
            flex: 1,
            borderRadius: 999,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.16)',
            backgroundColor: blurTargetAlive ? 'transparent' : 'rgba(7, 7, 8, 0.88)',
          }}
        >
          {blurTargetAlive ? (
            <BlurView
              tint="systemThinMaterialDark"
              intensity={75}
              blurReductionFactor={3}
              blurMethod="dimezisBlurViewSdk31Plus"
              blurTarget={blurTarget}
              style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
            />
          ) : null}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: blurTargetAlive
                  ? 'rgba(7, 7, 8, 0.16)'
                  : 'transparent',
              },
            ]}
          />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {visibleRoutes.map((route) => {
              const focused = state.routes[state.index]?.key === route.key;
              const showFocused = focused && !quickLogOpen;
              const meta = metaFor(route.name, colors);
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityLabel={meta.label}
                  accessibilityState={{ selected: focused }}
                  disabled={quickLogOpen}
                  onPress={() => pressTab(route, focused)}
                  onLongPress={() =>
                    emitter.emit({ type: 'tabLongPress', target: route.key })
                  }
                  onLayout={
                    focused
                      ? (event) => {
                          const { x, width: tabWidth } = event.nativeEvent.layout;
                          setTabLayout((current) =>
                            current && current.x === x && current.width === tabWidth
                              ? current
                              : { x, width: tabWidth },
                          );
                        }
                      : undefined
                  }
                  style={({ pressed }) => ({
                    width: quickLogOpen ? quietWidth : focused ? activeWidth : inactiveWidth,
                    flexGrow: 0,
                    flexShrink: 0,
                    height: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: showFocused ? 14 : 0,
                    borderRadius: 22,
                    backgroundColor: showFocused ? colors.primary : 'transparent',
                    gap: 6,
                    opacity: quickLogOpen ? 0.28 : pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Icon
                    name={meta.icon}
                    size={showFocused ? 20 : 21}
                    color={showFocused ? colors.onPrimary : colors.textSecondary}
                  />
                  {showFocused ? (
                    <AppText
                      variant="callout"
                      numberOfLines={1}
                      style={{ fontSize: 13, fontWeight: '700', color: colors.onPrimary }}
                    >
                      {meta.label}
                    </AppText>
                  ) : null}
                  {showFocused && hasSections ? (
                    <View
                      style={{
                        marginLeft: -2,
                        transform: [{ rotate: popupOpen ? '90deg' : '-90deg' }],
                      }}
                    >
                      <Icon name="chevron" size={12} color={colors.onPrimary} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            {hasVisibleActive ? null : <View style={{ flex: 1 }} />}
            {quickLog}
          </View>
        </View>
      </View>
    </View>
  );
};
