import { BlurTargetView, BlurView } from 'expo-blur';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useMemo, useRef, useSyncExternalStore, type ComponentRef } from 'react';
import {
  findNodeHandle,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeTabs, useIsTabRoute } from '@/components/ui/swipe';
import { getBlurTarget, setBlurTarget, subscribeBlurTarget } from '@/lib/blur-target';
import { space, useTheme } from '@/theme';

interface ScreenProps extends ScrollViewProps {
  /** Set false when a native header already consumes the top inset. */
  safeAreaTop?: boolean;
  /** A fixed, frosted header bar that the page scrolls underneath. */
  header?: React.ReactNode;
}

const HEADER_HEIGHT = 64;

export const Screen = ({
  children,
  contentContainerStyle,
  safeAreaTop = true,
  header,
  ...rest
}: ScreenProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // The bar grows with the user's text size so the title never clips.
  const headerHeight = HEADER_HEIGHT + Math.max(0, fontScale - 1) * 40;
  const isTab = useIsTabRoute();
  const isFocused = useIsFocused();
  const targetRef = useRef<ComponentRef<typeof View>>(null);
  const topInset = safeAreaTop ? insets.top : 0;
  const blurTargetNode = useSyncExternalStore(
    subscribeBlurTarget,
    getBlurTarget,
    getBlurTarget,
  );
  const blurTarget = useMemo(() => ({ current: blurTargetNode }), [blurTargetNode]);

  useFocusEffect(
    useCallback(() => {
      if (!isTab) return;
      // Wait a frame so a returning screen's native target is attached before
      // BlurView asks for its node handle.
      const frame = requestAnimationFrame(() => {
        const node = targetRef.current;
        if (!node) return;
        try {
          if (findNodeHandle(node)) setBlurTarget(node);
        } catch {
          // The target is between native mount lifecycles; leave the last one.
        }
      });
      return () => {
        cancelAnimationFrame(frame);
        if (getBlurTarget() === targetRef.current) setBlurTarget(null);
      };
    }, [isTab]),
  );

  return (
    <SwipeTabs>
      <View style={{ flex: 1 }}>
        <BlurTargetView ref={targetRef} style={{ flex: 1 }}>
          <ScrollView
            {...rest}
            style={{ flex: 1, backgroundColor: colors.background }}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              {
                paddingHorizontal: space.xl,
                paddingTop: topInset + (header ? headerHeight + space.md : space.lg),
                paddingBottom: isTab ? space.section + 124 : space.section,
                gap: space.lg,
                width: '100%',
                maxWidth: 720,
                alignSelf: 'center',
              },
              contentContainerStyle,
            ]}
          >
            {children}
          </ScrollView>
        </BlurTargetView>

        {header ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              minHeight: topInset + headerHeight,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            {isFocused && blurTargetNode ? (
              <BlurView
                tint="dark"
                intensity={45}
                blurMethod="dimezisBlurViewSdk31Plus"
                blurTarget={blurTarget}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7,7,8,0.64)' }]}
            />
            <View
              style={{
                flex: 1,
                paddingTop: topInset + space.sm,
                paddingHorizontal: space.xl,
                paddingBottom: space.sm,
                justifyContent: 'center',
                width: '100%',
                maxWidth: 720,
                alignSelf: 'center',
              }}
            >
              {header}
            </View>
          </View>
        ) : null}
      </View>
    </SwipeTabs>
  );
};
