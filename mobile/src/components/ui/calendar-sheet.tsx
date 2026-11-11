import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * In-app calendar in the app's own language: hairlines, lime selection, no
 * system dialog. Used wherever a date is picked (birth date, records).
 */
export const CalendarSheet = ({
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
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  useEffect(() => {
    if (visible) setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value, visible]);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const blanks = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: dayCount }, (_, index) => index + 1);
    return [...blanks, ...days];
  }, [month]);

  const shift = (delta: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const pick = (day: number) => {
    onSelect(new Date(month.getFullYear(), month.getMonth(), day, 12, 0, 0));
    onClose();
  };

  const today = new Date();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close calendar"
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => shift(-1)}
              hitSlop={12}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText variant="headline" tone="secondary">
                ‹
              </AppText>
            </Pressable>
            <AppText variant="headline">
              {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => shift(1)}
              hitSlop={12}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText variant="headline" tone="secondary">
                ›
              </AppText>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((label, index) => (
              <View key={`${label}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
                <AppText variant="caption" tone="tertiary">
                  {label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={{ width: '14.2857%', height: 44 }} />;
              }
              const date = new Date(month.getFullYear(), month.getMonth(), day, 12, 0, 0);
              const selected = sameDay(date, value);
              const isToday = sameDay(date, today);
              return (
                <View
                  key={`day-${day}`}
                  style={{ width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={date.toDateString()}
                    onPress={() => pick(day)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.primary : 'transparent',
                      borderWidth: isToday && !selected ? 1 : 0,
                      borderColor: colors.primary,
                    }}
                  >
                    <AppText
                      variant="callout"
                      style={{
                        color: selected
                          ? colors.onPrimary
                          : isToday
                            ? colors.primary
                            : colors.text,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {day}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: space.sm, paddingTop: space.xs }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSelect(new Date());
                onClose();
              }}
              style={{ flex: 1, paddingVertical: space.sm }}
            >
              <AppText variant="footnote" tone="primary">
                Today
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={{ paddingVertical: space.sm }}
            >
              <AppText variant="footnote" tone="secondary">
                Cancel
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
