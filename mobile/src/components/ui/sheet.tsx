import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { radius, space, useTheme } from '@/theme';

interface SheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Native page sheet on iOS, full-height slide on Android. */
export const Sheet = ({ visible, title, subtitle, onClose, children, footer }: SheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View
          style={{
            paddingTop: space.lg,
            paddingHorizontal: space.xl,
            paddingBottom: space.md,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: space.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.separator,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="headline">{title}</AppText>
            {subtitle ? (
              <AppText variant="footnote" tone="secondary">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: space.xl,
            gap: space.lg,
            paddingBottom: space.section,
          }}
        >
          {children}
        </ScrollView>

        {footer ? (
          <View
            style={{
              paddingHorizontal: space.xl,
              paddingTop: space.md,
              paddingBottom: Math.max(insets.bottom, space.lg),
              borderTopWidth: 1,
              borderTopColor: colors.separator,
              backgroundColor: colors.background,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
};
