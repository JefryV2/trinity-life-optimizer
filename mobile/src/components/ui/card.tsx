import { View, type ViewProps } from 'react-native';

import { radius, shadow, space, useTheme } from '@/theme';

interface CardProps extends ViewProps {
  padded?: boolean;
  raised?: boolean;
}

export const Card = ({ padded = true, raised = false, style, ...rest }: CardProps) => {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          borderCurve: 'continuous',
          padding: padded ? space.xl : 0,
          boxShadow: raised ? shadow.raised : shadow.card,
        },
        style,
      ]}
    />
  );
};
