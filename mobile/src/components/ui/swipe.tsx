import { usePathname, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';

/** The five tab routes, in the order the bottom bar shows them. */
export const TAB_ROUTES = ['/', '/health', '/wealth', '/relations', '/more'] as const;

/** True on the five tab screens, which need room for the floating bar. */
export const useIsTabRoute = () => {
  const pathname = usePathname();
  return TAB_ROUTES.includes(pathname as (typeof TAB_ROUTES)[number]);
};

const THRESHOLD = 42;

/**
 * Horizontal drags change page; vertical drags are left alone so scrolling and
 * pull-to-refresh never fight the pager. PanResponder is used rather than a
 * gesture worklet because the screens are scroll views and this keeps the
 * arbitration on the JS thread, where it is predictable.
 */
const useHorizontalSwipe = (onSwipe: (direction: -1 | 1) => void) => {
  const handler = useRef(onSwipe);
  handler.current = onSwipe;

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          const horizontal = Math.abs(gesture.dx) > 18;
          const dominant = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6;
          return horizontal && dominant;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_event, gesture) => {
          // a quick flick counts even if it never travelled the full threshold
          const flick = Math.abs(gesture.vx) > 0.45;
          if (gesture.dx <= -THRESHOLD || (flick && gesture.dx <= -18)) handler.current(1);
          else if (gesture.dx >= THRESHOLD || (flick && gesture.dx >= 18)) handler.current(-1);
        },
      }),
    [],
  );
};

export const SwipeTabs = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const index = TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]);

  const pager = useHorizontalSwipe((direction) => {
    const next = TAB_ROUTES[index + direction];
    if (!next) return;
    router.replace(next as never);
  });

  if (index < 0) return <>{children}</>;

  return (
    <View style={{ flex: 1 }} {...pager.panHandlers}>
      {children}
    </View>
  );
};

/**
 * The same gesture one level down: swiping the body of a screen steps through
 * that screen's own tabs instead of leaving the page.
 */
export const SwipeSteps = ({
  index,
  count,
  onChange,
  children,
}: {
  index: number;
  count: number;
  onChange: (index: number) => void;
  children: React.ReactNode;
}) => {
  const pager = useHorizontalSwipe((direction) => {
    const next = index + direction;
    if (next < 0 || next >= count) return;
    onChange(next);
  });

  return (
    <View style={{ gap: 16 }} {...pager.panHandlers}>
      {children}
    </View>
  );
};
