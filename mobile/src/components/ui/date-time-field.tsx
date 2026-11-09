import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { radius, space, useTheme } from '@/theme';

interface DateTimeFieldProps {
  label: string;
  value: Date;
  mode?: 'date' | 'time';
  onChange: (value: Date) => void;
}

export const DateTimeField = ({ label, value, mode = 'date', onChange }: DateTimeFieldProps) => {
  const { colors } = useTheme();
  const [iosPickerVisible, setIosPickerVisible] = useState(false);

  const open = () => {
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
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: radius.small,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceAlt,
          paddingHorizontal: space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        })}
      >
        <AppText variant="body" style={{ fontVariant: ['tabular-nums'] }}>
          {formatted}
        </AppText>
        <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={17} color={colors.textTertiary} />
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
    </View>
  );
}