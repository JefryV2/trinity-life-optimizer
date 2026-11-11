import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * A short settle-in for a section that appears once. Motion is opacity plus a
 * 6px lift, 220ms, staggered by index — enough to keep the page from teleporting
 * without animating anything the reader is already studying.
 */
export const Reveal = ({
  children,
  index = 0,
  delay = 0,
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
}) => (
  <Animated.View entering={FadeInDown.duration(220).delay(delay + index * 45)}>
    {children}
  </Animated.View>
);
