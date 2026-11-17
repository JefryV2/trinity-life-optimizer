import type { ComponentRef } from 'react';
import { findNodeHandle, type View } from 'react-native';

type BlurTarget = ComponentRef<typeof View>;

/**
 * The tab bar's frosted glass needs a native view to sample. Every tab screen
 * registers its content view while focused, so the bar always blurs the page
 * directly underneath it rather than the whole window (or a stale tab).
 */
let current: BlurTarget | null = null;
const listeners = new Set<() => void>();

export const getBlurTarget = () => current;

export const setBlurTarget = (target: BlurTarget | null) => {
  if (current === target) return;
  current = target;
  listeners.forEach((listener) => listener());
};

export const subscribeBlurTarget = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A node handle can survive in JS after its native view is torn down. */
export const isBlurTargetAlive = (target: BlurTarget | null) => {
  if (!target) return false;
  try {
    return Boolean(findNodeHandle(target));
  } catch {
    return false;
  }
};
