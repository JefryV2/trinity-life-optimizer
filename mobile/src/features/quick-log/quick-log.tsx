import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, BackHandler, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { BlurScrim } from '@/components/ui/blur-scrim';
import { Icon, type IconName } from '@/components/ui/icon';
import { openAdd } from '@/lib/navigation';
import { radius, space, useTheme } from '@/theme';

interface QuickLogProps {
  visible: boolean;
  onClose: () => void;
}

const BAR_HEIGHT = 64;

const ACTIONS: Array<{
  key: string;
  label: string;
  icon: IconName;
  open: () => void;
  emphasized?: boolean;
  tone: 'health' | 'wealth' | 'people';
}> = [
  {
    key: 'sleep',
    label: 'Sleep',
    icon: 'moon',
    open: () => openAdd('sleep'),
    tone: 'people',
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: 'message',
    open: () => openAdd('interaction'),
    tone: 'people',
  },
  {
    key: 'expense',
    label: 'Expense',
    icon: 'wallet',
    open: () => openAdd('transaction'),
    tone: 'wealth',
  },
  {
    key: 'mood',
    label: 'Mood',
    icon: 'brain',
    open: () => openAdd('mental'),
    tone: 'health',
  },
  {
    key: 'food',
    label: 'Food',
    icon: 'food',
    open: () => router.push('/meal-builder' as never),
    tone: 'health',
  },
  {
    key: 'water',
    label: 'Water',
    icon: 'water',
    open: () => router.push('/hydration' as never),
    emphasized: true,
    tone: 'health',
  },
];

/** The floating quick-log stack shared by every tab. */
export const QuickLog = ({ visible, onClose }: QuickLogProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entrance = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const barBottom = Math.max(10, insets.bottom + 2);
  const dockTop = barBottom + BAR_HEIGHT;
  const stackBottom = dockTop + 8;

  useEffect(() => {
    if (!visible) return;
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 170,
      useNativeDriver: true,
    }).start();
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [visible, entrance]);

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close quick log"
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: dockTop,
        }}
      >
        <BlurScrim />
      </Pressable>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: barBottom,
          zIndex: 2,
        }}
      >
        <BlurScrim />
      </View>

      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 24,
          bottom: stackBottom,
          alignItems: 'flex-end',
          gap: 10,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
            },
          ],
        }}
      >
        {ACTIONS.map((action) => {
          const emphasized = action.emphasized === true;
          return (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                onClose();
                action.open();
              }}
              style={({ pressed }) => ({
                width: 174,
                height: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.md,
                paddingLeft: space.xl,
                paddingRight: 7,
                borderRadius: radius.pill,
                backgroundColor: emphasized ? colors.primary : colors.surfaceAlt,
                borderWidth: emphasized ? 0 : 1,
                borderColor: 'rgba(255,255,255,0.08)',
                opacity: pressed ? 0.72 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <AppText
                variant="callout"
                style={{
                  color: emphasized ? colors.onPrimary : colors.text,
                  fontWeight: '700',
                  fontSize: 18,
                }}
              >
                {action.label}
              </AppText>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: emphasized ? colors.onPrimary : colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={action.icon}
                  size={20}
                  color={emphasized ? colors.primary : colors.onPrimary}
                />
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
};
