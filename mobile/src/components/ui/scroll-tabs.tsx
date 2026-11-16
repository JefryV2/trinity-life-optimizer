import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, type ScrollViewInstance } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { space, useTheme } from '@/theme';

interface ScrollTabsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

type TabLayout = { x: number; width: number };

const GAP = 26;

/**
 * A quiet rail, not a menu. Fewer labels are visible at once, the selected
 * tab is brought to the middle, and one lime line glides between labels
 * instead of appearing under the new one. The rail has no second rule: the
 * page header already owns the hairline.
 */
export const ScrollTabs = <T extends string>({ options, value, onChange }: ScrollTabsProps<T>) => {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  const [viewport, setViewport] = useState(0);
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const measured = useRef(false);
  const centered = useRef(false);
  const activeLayout = layouts[value];

  useEffect(() => {
    if (!activeLayout) return;
    if (!measured.current) {
      indicatorX.setValue(activeLayout.x);
      indicatorWidth.setValue(activeLayout.width);
      measured.current = true;
      setIndicatorVisible(true);
      return;
    }
    Animated.parallel([
      Animated.timing(indicatorX, {
        toValue: activeLayout.x,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(indicatorWidth, {
        toValue: activeLayout.width,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeLayout, indicatorX, indicatorWidth]);

  useEffect(() => {
    if (!activeLayout || viewport === 0) return;
    const target = Math.max(0, activeLayout.x + activeLayout.width / 2 - viewport / 2);
    scrollRef.current?.scrollTo({ x: target, animated: centered.current });
    centered.current = true;
  }, [activeLayout, viewport]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setViewport((previous) => (previous === width ? previous : width));
      }}
      style={{ marginHorizontal: -space.xl }}
      contentContainerStyle={{
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: GAP,
        paddingLeft: space.xl,
        paddingRight: space.section,
        position: 'relative',
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(option.value);
            }}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setLayouts((previous) => {
                const current = previous[option.value];
                if (current && current.x === x && current.width === width) return previous;
                return { ...previous, [option.value]: { x, width } };
              });
            }}
            style={{ paddingVertical: 12, justifyContent: 'center' }}
          >
            <AppText
              variant="callout"
              tone={selected ? 'default' : 'tertiary'}
              style={{ fontSize: 13 }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 2,
          borderRadius: 2,
          backgroundColor: colors.primary,
          opacity: indicatorVisible ? 1 : 0,
          width: indicatorWidth,
          transform: [{ translateX: indicatorX }],
        }}
      />
    </ScrollView>
  );
};
