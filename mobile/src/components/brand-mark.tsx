import { View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Three overlapping circles: the three pillars of Trinity. Drawn with plain
 * Views so it stays crisp at every size and picks up the theme automatically.
 */
export const BrandMark = ({ size = 64 }: { size?: number }) => {
  const { colors } = useTheme();
  const dot = size * 0.46;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        borderCurve: 'continuous',
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: dot * 1.5, height: dot * 1.5 }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: dot * 0.5,
            width: dot,
            height: dot,
            borderRadius: dot,
            backgroundColor: colors.primary,
            opacity: 0.92,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: dot,
            height: dot,
            borderRadius: dot,
            backgroundColor: colors.accent,
            opacity: 0.86,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dot,
            height: dot,
            borderRadius: dot,
            backgroundColor: colors.amber,
            opacity: 0.86,
          }}
        />
      </View>
    </View>
  );
};
