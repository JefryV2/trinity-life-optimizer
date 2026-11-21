import { BlurView } from 'expo-blur';
import { useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { getBlurTarget, isBlurTargetAlive, subscribeBlurTarget } from '@/lib/blur-target';

/**
 * A transparent pop-up scrim that frosts the page instead of painting a flat
 * black veil over it. The blur target is the focused tab's scroll host, which
 * is already registered for the floating dock.
 */
export const BlurScrim = () => {
  const target = useSyncExternalStore(subscribeBlurTarget, getBlurTarget, getBlurTarget);
  const alive = isBlurTargetAlive(target);
  const blurTarget = useMemo(() => ({ current: target }), [target]);

  return (
    <>
      {alive ? (
        <BlurView
          pointerEvents="none"
          tint="systemThinMaterialDark"
          intensity={78}
          blurReductionFactor={3}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: alive ? 'rgba(7, 7, 8, 0.4)' : 'rgba(0, 0, 0, 0.72)',
          },
        ]}
      />
    </>
  );
};
