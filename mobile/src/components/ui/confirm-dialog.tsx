import { Modal, Pressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { BlurScrim } from '@/components/ui/blur-scrim';
import { Button } from '@/components/ui/button';
import { space, useTheme } from '@/theme';

/**
 * A themed replacement for the system Alert. Sheet at the bottom, hairline
 * border, no shadows — the same language as the calendar and food sheets.
 */
export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <BlurScrim />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onCancel}
          style={{ flex: 1 }}
        />
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <Animated.View
            accessibilityViewIsModal
            entering={SlideInDown.duration(220)}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: space.xxl,
              paddingTop: space.xl,
              paddingBottom: Math.max(space.xxl, insets.bottom + space.lg),
              gap: space.lg,
            }}
          >
            <View style={{ gap: space.sm }}>
              <AppText variant="headline">{title}</AppText>
              {message ? (
                <AppText variant="footnote" tone="secondary">
                  {message}
                </AppText>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button label={cancelLabel} variant="ghost" onPress={onCancel} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={confirmLabel}
                  variant={destructive ? 'danger' : 'primary'}
                  loading={loading}
                  onPress={onConfirm}
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};
