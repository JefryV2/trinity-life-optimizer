import { View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, useTheme } from '@/theme';

/**
 * The grouped surface used by the Health and Wealth pages. It is a calm
 * container, not a card with decoration: one background, one radius, no
 * borders or shadows.
 */
export const Panel = ({
  children,
  style,
  padded = true,
  background,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  background?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: background ?? colors.surfaceAlt,
          borderRadius: radius.group,
          padding: padded ? space.lg : 0,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
