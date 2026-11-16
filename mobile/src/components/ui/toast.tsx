import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

type ToastAction = { label: string; onPress: () => void };

type ToastState = {
  id: number;
  message: string;
  action?: ToastAction;
};

let current: ToastState | null = null;
const listeners = new Set<() => void>();
let nextId = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const hide = () => {
  current = null;
  if (timer) clearTimeout(timer);
  timer = null;
  emit();
};

const show = (message: string, action?: ToastAction) => {
  current = { id: ++nextId, message, action };
  if (timer) clearTimeout(timer);
  timer = setTimeout(hide, action ? 5000 : 2800);
  emit();
};

export const toast = { show, hide };

export const ToastHost = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useSyncExternalStore(subscribe, () => current, () => current);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!state) return;
    opacity.setValue(0);
    translate.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [state, opacity, translate]);

  if (!state) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(88, insets.bottom + 76),
        alignItems: 'center',
        paddingHorizontal: space.xl,
      }}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY: translate }],
          maxWidth: 520,
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
        }}
      >
        <AppText variant="footnote" style={{ flex: 1 }}>
          {state.message}
        </AppText>
        {state.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              state.action?.onPress();
              hide();
            }}
            hitSlop={10}
          >
            <AppText variant="footnote" tone="primary">
              {state.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
};
