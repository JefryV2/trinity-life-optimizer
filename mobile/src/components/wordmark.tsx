import { Image } from 'react-native';

const RATIO = 457 / 127;

/** The Auxo wordmark. One asset, one lime, no background. */
export const Wordmark = ({ height = 30 }: { height?: number }) => (
  <Image
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    source={require('../../assets/images/auxo-wordmark.png')}
    style={{ width: Math.round(height * RATIO), height }}
    resizeMode="contain"
    accessibilityRole="image"
    accessibilityLabel="Auxo"
  />
);
