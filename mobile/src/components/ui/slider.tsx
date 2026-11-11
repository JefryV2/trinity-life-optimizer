import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { clamp } from '@/lib/format';
import { space, useTheme } from '@/theme';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
}

export const Slider = ({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  label,
  formatValue,
}: SliderProps) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const state = useRef({ width: 0, min, max, step, onChange });
  state.current = { width, min, max, step, onChange };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => setFromX(event.nativeEvent.locationX),
      onPanResponderMove: (event) => setFromX(event.nativeEvent.locationX),
      onPanResponderRelease: () => {
      },
    }),
  ).current;

  const setFromX = (x: number) => {
    const { width: trackWidth, min: lo, max: hi, step: snap, onChange: notify } = state.current;
    if (trackWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    const snapped = Math.round((lo + ratio * (hi - lo)) / snap) * snap;
    notify(Number(clamp(snapped, lo, hi).toFixed(2)));
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <View style={{ gap: space.xs }}>
      {label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="footnote" tone="secondary">
            {label}
          </AppText>
          <AppText variant="footnote" style={{ fontVariant: ['tabular-nums'] }}>
            {formatValue ? formatValue(value) : value}
          </AppText>
        </View>
      ) : null}
      <View
        {...responder.panHandlers}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: value }}
        style={{ height: 44, justifyContent: 'center' }}
      >
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.surfaceSunken,
            overflow: 'visible',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${percent}%`,
              borderRadius: 3,
              backgroundColor: colors.primary,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: -11,
              left: `${percent}%`,
              marginLeft: -14,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.background,
              borderWidth: 2,
              borderColor: colors.primary,
            }}
          />
        </View>
      </View>
    </View>
  );
}