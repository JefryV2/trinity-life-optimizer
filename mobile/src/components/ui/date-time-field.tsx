import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
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
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const open = () => {
    // Dates use the app's own calendar; times use the native picker, which is
    // the one place the OS handles a control better than we can.
    if (mode === 'date') {
      setSheetVisible(true);
      return;
    }
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        onChange: (event, date) => {
          if (event.type !== 'dismissed' && date) onChange(date);
        },
      });
    } else {
      setIosPickerVisible((visible) => !visible);
    }
  };

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
            fontSize: 19,
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatted}
        </AppText>
        <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={18} color={colors.textTertiary} />
      </Pressable>
      {iosPickerVisible && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="spinner"
          onChange={(_event, date) => {
            if (date) onChange(date);
          }}
        />
      ) : null}
      <CalendarSheet
        visible={sheetVisible}
        value={value}
        onClose={() => setSheetVisible(false)}
        onSelect={onChange}
      />
    </View>
  );
};
