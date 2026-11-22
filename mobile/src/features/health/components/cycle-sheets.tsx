import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { useHealth } from '@/features/health/use-health';
import { useProfile } from '@/features/profile/use-profile';
import { formatDate, isoDate } from '@/lib/format';
import { fonts, radius, space, useTheme } from '@/theme';

type Flow = 'light' | 'moderate' | 'heavy';

const FLOWS: Array<{ value: Flow; label: string; bars: number }> = [
  { value: 'light', label: 'Light', bars: 1 },
  { value: 'moderate', label: 'Medium', bars: 2 },
  { value: 'heavy', label: 'Heavy', bars: 3 },
];

const PERIOD_LENGTHS = [2, 3, 4, 5, 6, 7];

const shiftDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const SheetFooter = ({
  onBack,
  label,
  loading,
  onSave,
}: {
  onBack: () => void;
  label: string;
  loading: boolean;
  onSave: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={({ pressed }) => ({
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="back" size={22} color={colors.textSecondary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: loading }}
        disabled={loading}
        onPress={onSave}
        style={({ pressed }) => ({
          flex: 1,
          height: 62,
          borderRadius: 31,
          backgroundColor: colors.primary,
          borderBottomWidth: 5,
          borderBottomColor: '#8FAE22',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.7 : pressed ? 0.86 : 1,
          transform: [{ translateY: pressed ? 3 : 0 }],
        })}
      >
        <AppText style={{ color: colors.onPrimary, fontFamily: fonts.black, fontSize: 18 }}>
          {loading ? 'Saving…' : label}
        </AppText>
      </Pressable>
    </View>
  );
};

const FlowCard = ({
  item,
  selected,
  onPress,
}: {
  item: (typeof FLOWS)[number];
  selected: boolean;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${item.label} flow`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 88,
        borderRadius: radius.group,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={{
              width: 15,
              height: 5,
              borderRadius: 3,
              backgroundColor:
                index < item.bars
                  ? selected
                    ? colors.onPrimary
                    : colors.textSecondary
                  : selected
                    ? 'rgba(7,7,8,0.28)'
                    : 'rgba(255,255,255,0.16)',
            }}
          />
        ))}
      </View>
      <AppText
        style={{
          color: selected ? colors.onPrimary : colors.text,
          fontFamily: fonts.bold,
          fontSize: 15,
        }}
      >
        {item.label}
      </AppText>
    </Pressable>
  );
};

const CycleRing = ({ cycleLength, periodLength }: { cycleLength: number; periodLength: number }) => {
  const { colors } = useTheme();
  const size = 242;
  const center = size / 2;
  const stroke = 14;
  const radiusValue = center - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radiusValue;
  const progress = Math.min(1, periodLength / Math.max(cycleLength, 1));

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radiusValue}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radiusValue}
          stroke={colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText
          style={{
            color: colors.text,
            fontFamily: fonts.black,
            fontSize: 64,
            lineHeight: 64,
            letterSpacing: -3,
          }}
        >
          {cycleLength}
        </AppText>
        <AppText variant="body" tone="secondary" style={{ marginTop: -4 }}>
          day cycle
        </AppText>
        <AppText variant="footnote" tone="primary" style={{ marginTop: 4, fontWeight: '700' }}>
          {periodLength}-day period
        </AppText>
      </View>
    </View>
  );
};

const ValueControl = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.separator,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label.toLowerCase()}`}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={({ pressed }) => ({
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AppText style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 28 }}>−</AppText>
      </Pressable>

      <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
        <AppText variant="caption" tone="secondary">
          {label}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <AppText
            style={{
              color: colors.text,
              fontFamily: fonts.black,
              fontSize: 38,
              lineHeight: 40,
              letterSpacing: -1.8,
            }}
          >
            {value}
          </AppText>
          <AppText variant="callout" tone="secondary">
            days
          </AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label.toLowerCase()}`}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={({ pressed }) => ({
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <AppText style={{ color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 28 }}>+</AppText>
      </Pressable>
    </View>
  );
};

export const CycleSettingsSheet = ({
  visible,
  onClose,
  cycleLength,
  periodLength,
  averageLength,
  averagePeriod,
  sampleSize,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  cycleLength: number;
  periodLength: number;
  averageLength: number;
  averagePeriod: number;
  sampleSize: number;
  onSaved?: () => void;
}) => {
  const { colors } = useTheme();
  const { saveCycleSettings } = useProfile();
  const [cycle, setCycle] = useState(cycleLength);
  const [period, setPeriod] = useState(periodLength);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCycle(cycleLength);
    setPeriod(periodLength);
  }, [cycleLength, periodLength, visible]);

  const save = async () => {
    setSaving(true);
    try {
      await saveCycleSettings.mutateAsync({ cycleLengthDays: cycle, periodLengthDays: period });
      toast.show('Cycle settings saved');
      onSaved?.();
      onClose();
    } catch (caught) {
      toast.show(caught instanceof Error ? caught.message : 'Could not save cycle settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      headerless
      background={colors.background}
      visible={visible}
      title="Cycle settings"
      onClose={onClose}
      footer={
        <SheetFooter label="Save settings" loading={saving} onBack={onClose} onSave={() => void save()} />
      }
    >
      <View style={{ gap: space.lg }}>
        <View style={{ gap: 4 }}>
          <AppText
            style={{
              color: colors.text,
              fontFamily: fonts.black,
              fontSize: 48,
              lineHeight: 49,
              letterSpacing: -2,
            }}
          >
            Cycle settings
          </AppText>
          <AppText variant="body" tone="secondary">
            Used for predictions across the app
          </AppText>
        </View>

        <CycleRing cycleLength={cycle} periodLength={period} />

        <View>
          <ValueControl
            label="Cycle length"
            value={cycle}
            min={21}
            max={45}
            onChange={setCycle}
          />
          <ValueControl
            label="Period length"
            value={period}
            min={2}
            max={10}
            onChange={setPeriod}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={sampleSize === 0}
          onPress={() => {
            setCycle(averageLength);
            setPeriod(averagePeriod);
          }}
          style={({ pressed }) => ({
            minHeight: 62,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: sampleSize > 0 ? 'rgba(198,242,78,0.5)' : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: sampleSize > 0 ? (pressed ? 0.75 : 1) : 0.45,
          })}
        >
          <AppText
            style={{
              color: sampleSize > 0 ? colors.primary : colors.textTertiary,
              fontFamily: fonts.bold,
              fontSize: 15,
            }}
          >
            {sampleSize > 0
              ? `Use my logged average · ${averageLength} / ${averagePeriod} days`
              : 'Log two cycles to use your average'}
          </AppText>
        </Pressable>

        <AppText
          variant="footnote"
          tone="tertiary"
          style={{ textAlign: 'center', lineHeight: 20 }}
        >
          {sampleSize > 0
            ? `Your logged cycles average ${averageLength} days, with a ${averagePeriod}-day period.`
            : 'Your logged cycles will shape this average once you have two.'}
          {'\n'}Predictions are estimates, not contraception or medical advice.
        </AppText>
      </View>
    </Sheet>
  );
};

export const CycleLogSheet = ({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved?: (date: string) => void;
}) => {
  const { colors } = useTheme();
  const { addCycle } = useHealth();
  const { data: profileData } = useProfile();
  const defaultPeriod = profileData?.health?.period_length_days ?? 5;

  const [startDate, setStartDate] = useState(() => new Date());
  const [periodLength, setPeriodLength] = useState(defaultPeriod);
  const [flow, setFlow] = useState<Flow>('moderate');
  const [pain, setPain] = useState(0);
  const [notes, setNotes] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStartDate(new Date());
    setPeriodLength(defaultPeriod);
    setFlow('moderate');
    setPain(0);
    setNotes('');
    setNoteOpen(false);
    setError(null);
  }, [defaultPeriod, visible]);

  const setDate = (date: Date) => {
    setStartDate(date);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await addCycle.mutateAsync({
        startDate: isoDate(startDate),
        endDate: isoDate(shiftDays(startDate, periodLength - 1)),
        periodLength,
        flow,
        pain,
        notes: notes.trim() || undefined,
      });
      toast.show('Cycle saved');
      onSaved?.(isoDate(startDate));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this cycle.');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  const yesterday = shiftDays(today, -1);
  const todaySelected = sameDay(startDate, today);
  const yesterdaySelected = sameDay(startDate, yesterday);

  return (
    <>
      <Sheet
        headerless
        background={colors.background}
        visible={visible}
        title="Log cycle start"
        onClose={onClose}
        footer={
          <SheetFooter label="Save cycle" loading={saving} onBack={onClose} onSave={() => void save()} />
        }
      >
        <View style={{ gap: space.lg }}>
          <View style={{ gap: 4 }}>
            <AppText variant="caption" tone="primary" style={{ letterSpacing: 1.2 }}>
              LOG
            </AppText>
            <AppText
              style={{
                color: colors.text,
                fontFamily: fonts.black,
                fontSize: 48,
                lineHeight: 49,
                letterSpacing: -2,
              }}
            >
              Log cycle start
            </AppText>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="secondary">
              First day
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: todaySelected }}
                onPress={() => setDate(today)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: todaySelected ? 'transparent' : colors.border,
                  backgroundColor: todaySelected ? colors.primary : colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <AppText
                  style={{
                    color: todaySelected ? colors.onPrimary : colors.text,
                    fontFamily: fonts.bold,
                    fontSize: 15,
                  }}
                >
                  Today
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: yesterdaySelected }}
                onPress={() => setDate(yesterday)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: yesterdaySelected ? 'transparent' : colors.border,
                  backgroundColor: yesterdaySelected ? colors.primary : colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <AppText
                  style={{
                    color: yesterdaySelected ? colors.onPrimary : colors.text,
                    fontFamily: fonts.bold,
                    fontSize: 15,
                  }}
                >
                  Yesterday
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCalendarVisible(true)}
                style={({ pressed }) => ({
                  flex: 1.2,
                  height: 52,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Icon name="calendar" size={18} color={colors.textSecondary} />
                <AppText style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 15 }}>
                  {formatDate(startDate)}
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="secondary">
              Period length
            </AppText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
              {PERIOD_LENGTHS.map((days) => {
                const selected = periodLength === days;
                return (
                  <Pressable
                    key={days}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setPeriodLength(days)}
                    style={({ pressed }) => ({
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: selected ? 'transparent' : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <AppText
                      style={{
                        color: selected ? colors.onPrimary : colors.text,
                        fontFamily: fonts.black,
                        fontSize: 22,
                      }}
                    >
                      {days}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="footnote" tone="secondary">
              {periodLength} days
            </AppText>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="caption" tone="secondary">
              Flow
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FLOWS.map((item) => (
                <FlowCard
                  key={item.value}
                  item={item}
                  selected={flow === item.value}
                  onPress={() => setFlow(item.value)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="secondary">
                Pain level
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <AppText style={{ color: colors.text, fontFamily: fonts.black, fontSize: 26, lineHeight: 28 }}>
                  {pain}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  /10
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: 11 }, (_value, index) => {
                const selected = pain === index;
                return (
                  <Pressable
                    key={index}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Pain ${index} of 10`}
                    onPress={() => setPain(index)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 42,
                      borderRadius: 8,
                      borderWidth: selected ? 2 : 0,
                      borderColor: selected ? colors.primary : 'transparent',
                      backgroundColor: selected ? 'rgba(198,242,78,0.14)' : colors.surfaceAlt,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  />
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="footnote" tone="tertiary">
                None
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                Severe
              </AppText>
            </View>
          </View>

          {noteOpen ? (
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Symptoms, mood, anything worth remembering"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={300}
              style={{
                minHeight: 76,
                borderRadius: radius.inner,
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: 15,
                padding: space.md,
                textAlignVertical: 'top',
              }}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setNoteOpen(true)}
              style={({ pressed }) => ({
                minHeight: 62,
                borderRadius: radius.group,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <AppText style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 24 }}>+</AppText>
              <AppText style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 15 }}>
                Add a note
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                · symptoms, mood
              </AppText>
            </Pressable>
          )}

          {error ? (
            <AppText variant="footnote" tone="danger">
              {error}
            </AppText>
          ) : null}
        </View>
      </Sheet>

      <CalendarSheet
        visible={calendarVisible}
        value={startDate}
        onClose={() => setCalendarVisible(false)}
        onSelect={setDate}
      />
    </>
  );
};
