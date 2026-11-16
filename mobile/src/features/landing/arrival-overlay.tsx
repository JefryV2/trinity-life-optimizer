import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Animated, Modal } from 'react-native';

import { BrandMoment } from '@/features/landing/brand-moment';
import { useTheme } from '@/theme';

interface ArrivalState {
  visible: boolean;
  animationDone: boolean;
  navigated: boolean;
}

let state: ArrivalState = {
  visible: false,
  animationDone: false,
  navigated: false,
};

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const update = (next: Partial<ArrivalState>) => {
  state = { ...state, ...next };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

/**
 * The arrival lives above the router, not inside onboarding. That lets the
 * dashboard mount underneath the still-playing wordmark; when the canvas
 * reaches its final mark and the route is ready, the whole overlay fades,
 * revealing the dashboard in one continuous movement.
 */
export const arrival = {
  /** Cover the app with the arrival and restart its short timeline. */
  start: () => update({ visible: true, animationDone: false, navigated: false }),
  /** The canvas reached its final wordmark. */
  done: () => update({ animationDone: true }),
  /** The dashboard route has been requested and can mount underneath. */
  navigated: () => update({ navigated: true }),
  /** Save failed: fade back to onboarding so the error can be read. */
  dismiss: () => update({ animationDone: true, navigated: true }),
  hide: () => update({ visible: false }),
};

export const ArrivalOverlay = () => {
  const { colors } = useTheme();
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const opacity = useRef(new Animated.Value(1)).current;
  const fading = useRef(false);

  // Reset opacity whenever the overlay is brought back for a new arrival.
  useEffect(() => {
    if (!current.visible) {
      fading.current = false;
      opacity.setValue(1);
      return;
    }
    opacity.setValue(1);
    fading.current = false;
    // If the WebView never reports completion, don't trap the user forever.
    const fallback = setTimeout(() => arrival.done(), 4200);
    return () => clearTimeout(fallback);
  }, [current.visible, opacity]);

  useEffect(() => {
    if (!current.visible || !current.animationDone || !current.navigated || fading.current) {
      return;
    }
    fading.current = true;
    const hold = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) arrival.hide();
      });
    }, 160);
    return () => clearTimeout(hold);
  }, [current.visible, current.animationDone, current.navigated, opacity]);

  if (!current.visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          opacity,
        }}
      >
        <BrandMoment onDone={arrival.done} />
      </Animated.View>
    </Modal>
  );
};
