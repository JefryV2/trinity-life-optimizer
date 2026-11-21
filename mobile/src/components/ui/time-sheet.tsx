import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BlurScrim } from '@/components/ui/blur-scrim';
import { Button } from '@/components/ui/button';
import { radius, space, useTheme } from '@/theme';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

/** In-app time picker, matching the calendar instead of the OS dialog. */
export const TimeSheet = ({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}) => {
  const { colors } = useTheme();
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(Math.round(value.getMinutes() / 5) * 5 % 60);

  useEffect(() => {
    if (!visible) return;
    setHour(value.getHours());
    setMinute(Math.round(value.getMinutes() / 5) * 5 % 60);
  }, [value, visible]);

  const done = () => {
    const next = new Date(value);
    next.setHours(hour, minute, 0, 0);
    onSelect(next);
    onClose();
  };

  const chip = (selected: boolean) => ({
    width: '15.2%' as const,
    minHeight: 38,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: selected ? colors.primary : colors.border,
    backgroundColor: selected ? colors.primary : colors.surface,
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <BlurScrim />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close time picker"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: space.xl,
            paddingTop: space.lg,
            paddingBottom: space.xxl,
            gap: space.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <AppText variant="headline">Time</AppText>
            <AppText variant="numeric" style={{ fontSize: 30, lineHeight: 34 }}>
              {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </AppText>
          </View>

          <AppText variant="caption" tone="tertiary">
            HOUR
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {HOURS.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: item === hour }}
                onPress={() => setHour(item)}
                style={chip(item === hour)}
              >
                <AppText
                  variant="footnote"
                  style={{ color: item === hour ? colors.onPrimary : colors.text, fontVariant: ['tabular-nums'] }}
                >
                  {String(item).padStart(2, '0')}
                </AppText>
              </Pressable>
            ))}
          </View>

          <AppText variant="caption" tone="tertiary">
            MINUTE
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {MINUTES.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: item === minute }}
                onPress={() => setMinute(item)}
                style={chip(item === minute)}
              >
                <AppText
                  variant="footnote"
                  style={{ color: item === minute ? colors.onPrimary : colors.text, fontVariant: ['tabular-nums'] }}
                >
                  {String(item).padStart(2, '0')}
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: space.md, paddingTop: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="secondary" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Set time" onPress={done} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
