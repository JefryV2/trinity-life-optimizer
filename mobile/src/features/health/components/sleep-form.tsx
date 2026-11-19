import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TimeSheet } from '@/components/ui/time-sheet';
import { useHealth } from '@/features/health/use-health';
import { useFormSubmit } from '@/lib/use-form-submit';
import { fonts, radius, space, useTheme } from '@/theme';

const PURPLE = '#B9A6FF';

const clock = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const splitHours = (hours: number) => {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes >= 60) return { whole: whole + 1, minutes: 0 };
  return { whole, minutes };
};

const TimeButton = ({
  label,
  value,
  color,
  icon,
  onPress,
}: {
  label: string;
  value: Date;
  color: string;
  icon: 'moon' | 'sun';
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${clock(value)}`}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, gap: 6, opacity: pressed ? 0.62 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={16} color={color} />
        <AppText variant="caption" style={{ color, letterSpacing: 0.7 }}>
          {label}
        </AppText>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingBottom: space.sm,
        }}
      >
        <AppText
          variant="headline"
          style={{ flex: 1, fontSize: 30, lineHeight: 34, letterSpacing: -1 }}
        >
          {clock(value)}
        </AppText>
        <Icon name="clock" size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
};

export const SleepForm = ({ recordId }: { recordId?: string }) => {
  const { colors } = useTheme();
  const { data, addSleep, updateSleep } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [hoursPart, setHoursPart] = useState('8');
  const [minutesPart, setMinutesPart] = useState('00');
  const [quality, setQuality] = useState(7);
  const [wake, setWake] = useState(() => {
    const date = new Date();
    date.setHours(7, 0, 0, 0);
    if (date.getTime() > Date.now()) date.setDate(date.getDate() - 1);
    return date;
  });
  const [bedtime, setBedtime] = useState(() => {
    const date = new Date(wake);
    date.setDate(date.getDate() - 1);
    date.setHours(23, 0, 0, 0);
    return date;
  });
  const [notes, setNotes] = useState('');
  const [timeSheet, setTimeSheet] = useState<'bed' | 'wake' | null>(null);
  const existing = data?.sleep.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    const parts = splitHours(existing.sleep_duration_hours ?? 8);
    setHoursPart(String(parts.whole));
    setMinutesPart(String(parts.minutes).padStart(2, '0'));
    setQuality(existing.sleep_quality ?? 7);
    if (existing.bedtime) setBedtime(new Date(existing.bedtime));
    if (existing.wake_time) setWake(new Date(existing.wake_time));
    setNotes(existing.notes ?? '');
  }, [existing?.id]);

  const hours = Math.max(0, Number(hoursPart || 0)) + Math.max(0, Number(minutesPart || 0)) / 60;

  const save = () => {
    const mins = Number(minutesPart);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      setError('Enter how many hours you slept (0–24).');
      return;
    }
    if (!Number.isFinite(mins) || mins < 0 || mins > 59) {
      setError('Minutes should be between 0 and 59.');
      return;
    }
    const input = {
      hours,
      quality,
      bedtime: bedtime.toISOString(),
      wakeTime: wake.toISOString(),
      notes,
    };
    void submit(() =>
      existing ? updateSleep.mutateAsync({ id: existing.id, ...input }) : addSleep.mutateAsync(input),
    );
  };

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.xxl, paddingBottom: space.xxl, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="caption" tone="primary" style={{ letterSpacing: 1.2 }}>
          LOG
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="close" size={21} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="title">{existing ? 'Edit sleep' : 'Log sleep'}</AppText>
        {!existing ? (
          <AppText variant="callout" tone="secondary">
            Last night
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
          HOURS SLEPT
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            accessibilityLabel="Hours"
            value={hoursPart}
            onChangeText={setHoursPart}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            style={{
              width: 92,
              color: colors.text,
              fontFamily: fonts.black,
              fontSize: 82,
              lineHeight: 88,
              letterSpacing: -3,
              padding: 0,
            }}
          />
          <AppText
            variant="headline"
            tone="tertiary"
            style={{ fontSize: 26, lineHeight: 30, marginRight: space.sm }}
          >
            h
          </AppText>
          <TextInput
            accessibilityLabel="Minutes"
            value={minutesPart}
            onChangeText={setMinutesPart}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            style={{
              width: 118,
              color: colors.text,
              fontFamily: fonts.black,
              fontSize: 82,
              lineHeight: 88,
              letterSpacing: -3,
              padding: 0,
            }}
          />
          <AppText
            variant="headline"
            tone="tertiary"
            style={{ fontSize: 26, lineHeight: 30 }}
          >
            m
          </AppText>
          <View style={{ flex: 1 }} />
          <Icon name="moon" size={40} color={PURPLE} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <TimeButton
          label="BEDTIME"
          value={bedtime}
          color={PURPLE}
          icon="moon"
          onPress={() => setTimeSheet('bed')}
        />
        <TimeButton
          label="WAKE TIME"
          value={wake}
          color={colors.primary}
          icon="sun"
          onPress={() => setTimeSheet('wake')}
        />
      </View>

      <View style={{ gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <AppText variant="headline">Sleep quality</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <AppText
              variant="headline"
              style={{ fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }}
            >
              {quality}
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              /10
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: 10 }, (_, index) => {
            const active = index + 1 <= quality;
            return (
              <Pressable
                key={index}
                accessibilityRole="adjustable"
                accessibilityLabel={`Sleep quality ${index + 1} of 10`}
                accessibilityState={{ selected: index + 1 === quality }}
                onPress={() => setQuality(index + 1)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 56,
                  borderRadius: radius.small,
                  backgroundColor: active ? colors.primary : colors.surfaceSunken,
                  opacity: pressed ? 0.65 : 1,
                })}
              />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="footnote" tone="tertiary">
            Rough
          </AppText>
          <AppText variant="footnote" tone="tertiary">
            Great
          </AppText>
        </View>
      </View>

      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Woke up once, vivid dreams…"
        multiline
        maxLength={300}
      />

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <View style={{ marginTop: 'auto', paddingTop: space.xl }}>
        <Button
          label={existing ? 'Save changes' : 'Save sleep'}
          loading={saving}
          onPress={save}
        />
      </View>

      <TimeSheet
        visible={timeSheet !== null}
        value={timeSheet === 'wake' ? wake : bedtime}
        onClose={() => setTimeSheet(null)}
        onSelect={(next) => {
          if (timeSheet === 'wake') setWake(next);
          else setBedtime(next);
        }}
      />
    </Screen>
  );
};
