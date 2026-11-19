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
  /** A small status pill beside the subtitle, e.g. "Period · day 3". */
  badge?: string;
  badgeTone?: 'danger' | 'primary';
  /** Larger sheet title for the daily check-in. */
  largeTitle?: boolean;
  /** The caller renders its own title so the sheet can open like a full page. */
  headerless?: boolean;
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
  badge,
  badgeTone = 'danger',
  largeTitle = false,
  headerless = false,
}: SheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetBackground = colors.surfaceAlt;

  const body = (
    <>
      {headerless ? null : (
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
          <AppText variant={largeTitle ? 'title' : 'headline'}>{title}</AppText>
          {subtitle || badge ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: space.sm,
                marginTop: 2,
              }}
            >
              {subtitle ? (
                <AppText variant="footnote" tone="secondary">
                  {subtitle}
                </AppText>
              ) : null}
              {badge ? (
                <View
                  style={{
                    borderRadius: radius.pill,
                    backgroundColor:
                      badgeTone === 'primary'
                        ? 'rgba(198,242,78,0.16)'
                        : 'rgba(255,107,90,0.16)',
                    paddingHorizontal: space.sm,
                    paddingVertical: 3,
                  }}
                >
                  <AppText
                    variant="footnote"
                    tone={badgeTone === 'primary' ? 'primary' : 'danger'}
                    style={{ fontWeight: '700' }}
                  >
                    {badge}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={12}
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      )}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        style={compact ? { flexGrow: 0, flexShrink: 1 } : { flex: 1 }}
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
            backgroundColor: sheetBackground,
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
              maxHeight: '94%',
              backgroundColor: sheetBackground,
              borderTopLeftRadius: radius.group,
              borderTopRightRadius: radius.group,
              borderTopWidth: 1,
              borderTopColor: colors.separator,
              overflow: 'hidden',
            }}
          >
            {!headerless ? (
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.border,
                  }}
                />
              </View>
            ) : null}
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
            height: '92%',
            backgroundColor: sheetBackground,
            borderTopLeftRadius: radius.group,
            borderTopRightRadius: radius.group,
            borderTopWidth: 1,
            borderTopColor: colors.separator,
            overflow: 'hidden',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>
          {body}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
