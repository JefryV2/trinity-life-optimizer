import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useHealth } from '@/features/health/use-health';
import { useFormSubmit } from '@/lib/use-form-submit';
import { fonts, radius, space, useTheme } from '@/theme';

const MOOD_COLOR = '#C6F24E';
const ENERGY_COLOR = '#FFB020';
const STRESS_COLOR = '#B9A6FF';
const ANXIETY_COLOR = '#3D7BFF';

const ScaleBars = ({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <AppText variant="headline" style={{ flex: 1 }}>
          {label}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <AppText
            variant="headline"
            style={{ fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }}
          >
            {value}
          </AppText>
          <AppText variant="footnote" tone="tertiary">
            /10
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: 10 }, (_, index) => {
          const active = index + 1 <= value;
          return (
            <Pressable
              key={index}
              accessibilityRole="adjustable"
              accessibilityLabel={`${label} ${index + 1} of 10`}
              accessibilityState={{ selected: index + 1 === value }}
              onPress={() => onChange(index + 1)}
              style={({ pressed }) => ({
                flex: 1,
                height: 40,
                borderRadius: radius.small,
                backgroundColor: active ? color : colors.surfaceSunken,
                opacity: pressed ? 0.65 : 1,
              })}
            />
          );
        })}
      </View>
    </View>
  );
};

const RingBackdrop = () => {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', right: -96, top: -52, opacity: 0.9 }}
    >
      <Svg width={270} height={270}>
        <Circle cx={135} cy={135} r={112} stroke={colors.bonds} strokeWidth={13} fill="none" strokeDasharray="190 520" rotation={-56} origin="135,135" />
        <Circle cx={135} cy={135} r={90} stroke="#B9A6FF" strokeWidth={13} fill="none" strokeDasharray="130 440" rotation={40} origin="135,135" />
        <Circle cx={135} cy={135} r={68} stroke={colors.amber} strokeWidth={13} fill="none" strokeDasharray="95 340" rotation={-145} origin="135,135" />
        <Circle cx={135} cy={135} r={46} stroke={colors.primary} strokeWidth={13} fill="none" strokeDasharray="70 220" rotation={95} origin="135,135" />
      </Svg>
    </View>
  );
};

export const MentalForm = ({ recordId, initialMood }: { recordId?: string; initialMood?: string }) => {
  const { colors } = useTheme();
  const { data, addMental, updateMental } = useHealth();
  const { saving, error, submit } = useFormSubmit();
  const [mood, setMood] = useState(initialMood ? Number(initialMood) : 6);
  const [stress, setStress] = useState(4);
  const [energy, setEnergy] = useState(6);
  const [anxiety, setAnxiety] = useState(3);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const existing = data?.mental.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setMood(existing.mood_rating ?? 6);
    setStress(existing.stress_level ?? 4);
    setEnergy(existing.energy_level ?? 6);
    setAnxiety(existing.anxiety_level ?? 3);
    setNotes(existing.notes ?? '');
    if (existing.logged_at) setDate(new Date(existing.logged_at));
  }, [existing?.id]);

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.xxl, paddingBottom: space.xxl, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <RingBackdrop />
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
        <AppText variant="title">{existing ? 'Edit check-in' : 'Check in'}</AppText>
        <AppText variant="callout" tone="secondary">
          How are you right now?
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Date ${date.toLocaleDateString()}`}
        onPress={() => setCalendarVisible(true)}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          minHeight: 48,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Icon name="calendar" size={18} color={colors.textSecondary} />
        <AppText variant="callout" style={{ fontWeight: '700' }}>
          {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </AppText>
      </Pressable>

      <View style={{ gap: space.xl, marginTop: space.sm }}>
        <ScaleBars label="Mood" color={MOOD_COLOR} value={mood} onChange={setMood} />
        <ScaleBars label="Energy" color={ENERGY_COLOR} value={energy} onChange={setEnergy} />
        <ScaleBars label="Stress" color={STRESS_COLOR} value={stress} onChange={setStress} />
        <ScaleBars label="Anxiety" color={ANXIETY_COLOR} value={anxiety} onChange={setAnxiety} />
      </View>

      <TextField
        label="What's on your mind? (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="A win, a worry, anything…"
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
          label={existing ? 'Save changes' : 'Save check-in'}
          loading={saving}
          onPress={() =>
            void submit(() => {
              const input = { mood, stress, energy, anxiety, notes, loggedAt: date.toISOString() };
              return existing
                ? updateMental.mutateAsync({ id: existing.id, ...input })
                : addMental.mutateAsync(input);
            })
          }
        />
      </View>

      <CalendarSheet
        visible={calendarVisible}
        value={date}
        onClose={() => setCalendarVisible(false)}
        onSelect={setDate}
      />
    </Screen>
  );
};
