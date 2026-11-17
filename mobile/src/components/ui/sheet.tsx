import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
  compact?: boolean;
}

/** Native page sheet on iOS, full-height slide on Android. */
export const Sheet = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  compact = false,
}: SheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const body = (
    <>
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
        style={compact ? { flexGrow: 0, flexShrink: 1 } : undefined}
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
    </>
  );

  if (compact) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          />
          <KeyboardAvoidingView
            behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
            style={{
              maxHeight: '88%',
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.group,
              borderTopRightRadius: radius.group,
              borderTopWidth: 1,
              borderTopColor: colors.separator,
              overflow: 'hidden',
            }}
          >
            {body}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

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
        {body}
      </KeyboardAvoidingView>
    </Modal>
  );
};
