import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { TimeSheet } from '@/components/ui/time-sheet';
import { fonts, space, useTheme } from '@/theme';

interface DateTimeFieldProps {
  label: string;
  value: Date;
  mode?: 'date' | 'time';
  onChange: (value: Date) => void;
}

/** A boxless date/time row — label above, value on a rule, chevron at the end. */
export const DateTimeField = ({ label, value, mode = 'date', onChange }: DateTimeFieldProps) => {
  const { colors } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  const open = () => setSheetVisible(true);

  const formatted =
    mode === 'time'
      ? value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatted}`}
        onPress={open}
        style={({ pressed }) => ({
          minHeight: 46,
          borderBottomWidth: 1,
          borderBottomColor: pressed ? colors.primary : colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 4,
          paddingBottom: 10,
        })}
      >
        <AppText
          variant="body"
          style={{
            fontFamily: fonts.medium,
            fontSize: 21,
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatted}
        </AppText>
        <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={18} color={colors.textTertiary} />
      </Pressable>
      {mode === 'date' ? (
        <CalendarSheet
          visible={sheetVisible}
          value={value}
          onClose={() => setSheetVisible(false)}
          onSelect={onChange}
        />
      ) : (
        <TimeSheet
          visible={sheetVisible}
          value={value}
          onClose={() => setSheetVisible(false)}
          onSelect={onChange}
        />
      )}
    </View>
  );
};
