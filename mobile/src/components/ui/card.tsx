import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  padded?: boolean;
  raised?: boolean;
}

/**
 * A section, not a box. The old bordered/filled card is gone — content now
 * flows straight down the page. Kept as `Card` so existing screens keep
 * compiling; `padded` and `raised` are no-ops kept for API compatibility.
 */
export const Card = ({ padded: _padded, raised: _raised, style, ...rest }: CardProps) => {
  return <View {...rest} style={style} />;
};
