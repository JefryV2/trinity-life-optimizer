import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { useSectionNav } from '@/features/navigation/section-nav';
import { useProfile } from '@/features/profile/use-profile';
import { getBlurTarget, isBlurTargetAlive, subscribeBlurTarget } from '@/lib/blur-target';
import {
  healthSections,
  WEALTH_SECTIONS,
  type HealthTab,
  type WealthTab,
} from '@/lib/navigation';
import { space, useTheme, type ThemeColors } from '@/theme';

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

/**
 * One dock for both levels of navigation. On a pillar page its left side is
 * that pillar's sections and its right side keeps every other pillar one tap
 * away. On Today, People and You it is the plain global tab bar.
 */
export const UnifiedDock = ({ state, emitter, navigateToTab, onQuickLog }: DockProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { data: profileData } = useProfile();
  const { health, wealth, setHealth, setWealth } = useSectionNav();
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const barWidth = Math.min(Math.max(width - 24, 300), 440);
  const narrow = barWidth < 360;
  const visibleLimit =
    fontScale > 1.15
      ? narrow
        ? 1
        : 2
      : narrow
        ? 2
        : 3;

  const activeIndex = options.findIndex((option) => option.value === active);
  const visible = options.slice(0, visibleLimit);
  if (activeIndex >= visibleLimit && visible.length > 0) {
    visible[visible.length - 1] = options[activeIndex];
  }
  const hasMore = options.length > visible.length;

  const target = useSyncExternalStore(subscribeBlurTarget, getBlurTarget, getBlurTarget);
  const blurTargetAlive = useMemo(() => isBlurTargetAlive(target), [target, fontScale]);
  const blurTarget = useMemo(() => ({ current: target }), [target]);

  useEffect(() => {
    setSheetOpen(false);
  }, [routeName]);

  const go = (name: string) => {
    const route = state.routes.find((candidate) => baseName(candidate.name) === name);
    if (!route) return;
    const event = emitter.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    }) as { defaultPrevented?: boolean };
    if (!event.defaultPrevented) navigateToTab(route.key);
  };

  const choose = (value: string) => {
    if (routeName === 'health') setHealth(value as HealthTab);
    else setWealth(value as WealthTab);
    setSheetOpen(false);
  };

  const quickLog = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quick log"
      accessibilityHint="Opens quick log actions"
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
        <Icon name="plus" size={19} color={colors.onPrimary} />
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
          backgroundColor: 'rgba(7, 7, 8, 0.82)',
        }}
      >
        {blurTargetAlive ? (
          <BlurView
            tint="systemThickMaterialDark"
            intensity={90}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={blurTarget}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View
          style={{
            flex: 1,
            paddingHorizontal: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {sectionMode ? (
            <>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {visible.map((option) => {
                  const selected = option.value === active;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option.label}
                      onPress={() => choose(option.value)}
                      style={({ pressed }) => ({
                        height: 44,
                        justifyContent: 'center',
                        marginRight: 6,
                        opacity: pressed ? 0.72 : 1,
                      })}
                    >
                      <View
                        style={{
                          height: 34,
                          justifyContent: 'center',
                          paddingHorizontal: selected ? 8 : 0,
                          borderRadius: 999,
                          backgroundColor: selected ? colors.primary : 'transparent',
                        }}
                      >
                        <AppText
                          variant="footnote"
                          numberOfLines={1}
                          style={{
                            color: selected ? colors.onPrimary : colors.textSecondary,
                            fontWeight: selected ? '700' : '600',
                          }}
                        >
                          {option.label}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}

                {hasMore ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="More sections"
                    onPress={() => setSheetOpen(true)}
                    style={({ pressed }) => ({
                      width: 24,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.55 : 1,
                    })}
                  >
                    <Icon name="more" size={18} color={colors.textTertiary} />
                  </Pressable>
                ) : null}
              </View>

              <View
                style={{
                  width: 1,
                  height: 24,
                  marginHorizontal: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                }}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {['index', routeName === 'health' ? 'wealth' : 'health', 'relations', 'more'].map(
                  (name) => {
                    const meta = metaFor(name, colors);
                    return (
                      <Pressable
                        key={name}
                        accessibilityRole="button"
                        accessibilityLabel={meta.label}
                        onPress={() => go(name)}
                        style={({ pressed }) => ({
                          width: 28,
                          height: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.55 : 1,
                        })}
                      >
                        <Icon name={meta.icon} size={18} color={colors.textTertiary} />
                      </Pressable>
                    );
                  },
                )}
                {quickLog}
              </View>
            </>
          ) : (
            <>
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
              {quickLog}
            </>
          )}
        </View>
      </View>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={routeName === 'health' ? 'Health sections' : 'Wealth sections'}
        compact
      >
        <View>
          {options.map((option, index) => {
            const selected = option.value === active;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => choose(option.value)}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.separator,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <AppText
                  variant="callout"
                  tone={selected ? 'default' : 'secondary'}
                  style={{ flex: 1 }}
                >
                  {option.label}
                </AppText>
                {selected ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
};
