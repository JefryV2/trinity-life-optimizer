import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

interface ScreenProps extends ScrollViewProps {
  /** Set false when a native header already consumes the top inset. */
  safeAreaTop?: boolean;
}

export const Screen = ({ children, contentContainerStyle, safeAreaTop = true, ...rest }: ScreenProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      {...rest}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        {
          paddingHorizontal: space.xl,
          paddingTop: (safeAreaTop ? insets.top : 0) + space.lg,
          paddingBottom: space.section,
          gap: space.lg,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
};
