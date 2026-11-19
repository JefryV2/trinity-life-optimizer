import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { Chips } from '@/components/ui/chips';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Slider } from '@/components/ui/slider';
import { TextField } from '@/components/ui/text-field';
import { useRelations } from '@/features/relations/use-relations';
import { useFormSubmit } from '@/lib/use-form-submit';
import { fonts, radius, space, useTheme } from '@/theme';

const RELATION_TYPES = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'partner', label: 'Partner' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' },
];

export const PersonForm = ({ recordId }: { recordId?: string }) => {
  const { data, addRelationship, updatePerson } = useRelations();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [type, setType] = useState('friend');
  const [importance, setImportance] = useState(3);
  const [notes, setNotes] = useState('');
  const existing = data?.relationships.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setType(existing.relation_type ?? 'friend');
    setImportance(existing.importance ?? 3);
    setNotes(existing.notes ?? '');
  }, [existing?.id]);

  const save = () => {
    if (!name.trim()) {
      setError('Who is this person?');
      return;
    }
    const input = { name, type, importance, notes };
    void submit(() =>
      existing ? updatePerson.mutateAsync({ id: existing.id, ...input }) : addRelationship.mutateAsync(input),
    );
  };

  return (
    <FormFrame
      title={existing ? 'Edit person' : 'Add a person'}
      submitLabel={existing ? 'Save changes' : 'Add person'}
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Who matters to you?"
          maxLength={60}
        />
        <Chips label="Type" options={RELATION_TYPES} value={type} onChange={setType} />
        <Slider
          label="Importance"
          value={importance}
          onChange={setImportance}
          min={1}
          max={5}
          formatValue={(value) => ['Acquaintance', 'Casual', 'Close', 'Core', 'Inner circle'][value - 1]}
        />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Birthday, what they care about, how you met…"
          multiline
          maxLength={300}
        />
      </View>
    </FormFrame>
  );
};

const CHANNELS = [
  { value: 'in_person', label: 'In person' },
  { value: 'call', label: 'Call' },
  { value: 'video', label: 'Video' },
  { value: 'text', label: 'Text' },
];

const DURATIONS = [15, 30, 45, 60];

const sameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dateWithOffset = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date;
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
    {children}
  </AppText>
);

const CounterCircle = ({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.55 : 1,
      })}
    >
      {children}
    </Pressable>
  );
};

export const InteractionForm = ({ personId, recordId }: { personId?: string; recordId?: string }) => {
  const { colors } = useTheme();
  const { data, logInteraction, updateInteraction } = useRelations();
  const { saving, error, setError, submit } = useFormSubmit();
  const people = data?.relationships ?? [];
  const [relationshipId, setRelationshipId] = useState<string | null>(personId ?? null);
  const [channel, setChannel] = useState('in_person');
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState(false);
  const [mood, setMood] = useState(7);
  const [notes, setNotes] = useState('');
  const [noteVisible, setNoteVisible] = useState(false);
  const [date, setDate] = useState(new Date());
  const [when, setWhen] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const existing = data?.interactions.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setRelationshipId(existing.relationship_id);
    setChannel(existing.channel ?? 'in_person');
    const minutes = Number(existing.duration_minutes ?? 30);
    setDuration(minutes);
    setCustomDuration(!DURATIONS.includes(minutes));
    setMood(existing.mood_rating ?? 7);
    setNotes(existing.notes ?? '');
    setNoteVisible(Boolean(existing.notes));
    const occurred = new Date(existing.occurred_at);
    setDate(occurred);
    setWhen(
      sameCalendarDay(occurred, new Date())
        ? 'today'
        : sameCalendarDay(occurred, dateWithOffset(1))
          ? 'yesterday'
          : 'custom',
    );
  }, [existing?.id]);

  useEffect(() => {
    if (relationshipId || existing || people.length === 0) return;
    setRelationshipId(people[0].id);
  }, [existing, people, relationshipId]);

  const recent = (data?.interactions ?? []).filter((entry) => entry.id !== recordId);
  const last = recent[0];
  const lastName = last
    ? people.find((person) => person.id === last.relationship_id)?.name ?? 'Someone'
    : null;

  const chooseToday = () => {
    setWhen('today');
    setDate(dateWithOffset(0));
  };

  const chooseYesterday = () => {
    setWhen('yesterday');
    setDate(dateWithOffset(1));
  };

  const pickCustomDate = (next: Date) => {
    const merged = new Date(date);
    merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
    setDate(merged);
    setWhen('custom');
  };

  const repeatLast = () => {
    if (!last) return;
    setRelationshipId(last.relationship_id);
    setChannel(last.channel ?? 'in_person');
    setDuration(Number(last.duration_minutes ?? 30));
    setCustomDuration(!DURATIONS.includes(Number(last.duration_minutes ?? 30)));
    setMood(last.mood_rating ?? 7);
    if (last.notes) {
      setNotes(last.notes);
      setNoteVisible(true);
    }
  };

  const save = () => {
    if (!relationshipId) {
      setError('Pick who you spent time with.');
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setError('How many minutes did it last?');
      return;
    }
    const input = {
      relationshipId,
      channel,
      duration,
      mood,
      notes,
      occurredAt: date.toISOString(),
    };
    void submit(() =>
      existing
        ? updateInteraction.mutateAsync({ id: existing.id, ...input })
        : logInteraction.mutateAsync(input),
    );
  };

  const whenPill = (selected: boolean) => ({
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: selected ? 0 : 1,
    borderColor: colors.border,
    backgroundColor: selected ? colors.primary : 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 6,
  });

  return (
    <Screen
      contentContainerStyle={{ paddingTop: space.xxl, paddingBottom: space.xxl, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginTop: -space.md,
        }}
      />
      <AppText variant="title">Log contact</AppText>

      <View style={{ gap: space.sm }}>
        <SectionLabel>Who</SectionLabel>
        {people.length === 0 ? (
          <AppText variant="callout" tone="secondary">
            Add a person first from the People tab.
          </AppText>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.md, paddingRight: space.md }}
          >
            {people.map((person) => {
              const selected = person.id === relationshipId;
              return (
                <Pressable
                  key={person.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={person.name}
                  onPress={() => setRelationshipId(person.id)}
                  style={({ pressed }) => ({
                    width: 66,
                    alignItems: 'center',
                    gap: 6,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: radius.pill,
                      backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 22,
                        lineHeight: 26,
                        color: selected ? colors.onPrimary : colors.textSecondary,
                      }}
                    >
                      {initialsFor(person.name)}
                    </AppText>
                  </View>
                  <AppText
                    variant="footnote"
                    tone={selected ? 'default' : 'tertiary'}
                    numberOfLines={1}
                    style={{ fontWeight: selected ? '700' : '500' }}
                  >
                    {person.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <SectionLabel>Channel</SectionLabel>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.pill,
            padding: 4,
            gap: 2,
          }}
        >
          {CHANNELS.map((option) => {
            const selected = option.value === channel;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => setChannel(option.value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 46,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText
                  variant="callout"
                  style={{
                    color: selected ? colors.onPrimary : colors.textSecondary,
                    fontWeight: selected ? '800' : '600',
                  }}
                  numberOfLines={1}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionLabel>Duration</SectionLabel>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {DURATIONS.map((minutes) => {
            const selected = !customDuration && duration === minutes;
            return (
              <Pressable
                key={minutes}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${minutes} minutes`}
                onPress={() => {
                  setCustomDuration(false);
                  setDuration(minutes);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 56,
                  borderRadius: radius.pill,
                  borderWidth: selected ? 0 : 1,
                  borderColor: colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText
                  variant="headline"
                  style={{ color: selected ? colors.onPrimary : colors.text }}
                >
                  {minutes}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: customDuration }}
            accessibilityLabel="Custom duration"
            onPress={() => setCustomDuration(true)}
            style={({ pressed }) => ({
              flex: 1.35,
              minHeight: 56,
              borderRadius: radius.pill,
              borderWidth: customDuration ? 0 : 1,
              borderColor: colors.border,
              backgroundColor: customDuration ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText
              variant="callout"
              style={{
                color: customDuration ? colors.onPrimary : colors.text,
                fontWeight: '700',
              }}
            >
              Custom
            </AppText>
          </Pressable>
        </View>
        {customDuration ? (
          <TextInput
            accessibilityLabel="Custom duration in minutes"
            value={String(duration || '')}
            onChangeText={(text) => setDuration(Math.max(0, Number(text.replace(',', '.')) || 0))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="Minutes"
            placeholderTextColor={colors.textFaint}
            style={{
              marginTop: space.xs,
              minHeight: 52,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceAlt,
              paddingHorizontal: space.lg,
              color: colors.text,
              fontFamily: fonts.medium,
              fontSize: 20,
            }}
          />
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <SectionLabel>Feeling</SectionLabel>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <AppText
              variant="headline"
              tone="primary"
              style={{ fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}
            >
              {mood}
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              /10
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: 10 }, (_, index) => {
            const value = index + 1;
            const active = value <= mood;
            return (
              <Pressable
                key={value}
                accessibilityRole="adjustable"
                accessibilityLabel={`Feeling ${value} of 10`}
                accessibilityState={{ selected: value === mood }}
                onPress={() => setMood(value)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 64,
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
            Drained
          </AppText>
          <AppText variant="footnote" tone="tertiary">
            Energised
          </AppText>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionLabel>When</SectionLabel>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: when === 'today' }}
            onPress={chooseToday}
            style={({ pressed }) => [whenPill(when === 'today'), { opacity: pressed ? 0.7 : 1 }]}
          >
            <AppText
              variant="callout"
              style={{
                color: when === 'today' ? colors.onPrimary : colors.text,
                fontWeight: '700',
              }}
            >
              Today
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: when === 'yesterday' }}
            onPress={chooseYesterday}
            style={({ pressed }) => [whenPill(when === 'yesterday'), { opacity: pressed ? 0.7 : 1 }]}
          >
            <AppText
              variant="callout"
              style={{
                color: when === 'yesterday' ? colors.onPrimary : colors.text,
                fontWeight: '700',
              }}
            >
              Yesterday
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: when === 'custom' }}
            onPress={() => setCalendarVisible(true)}
            style={({ pressed }) => [whenPill(when === 'custom'), { opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon
              name="calendar"
              size={17}
              color={when === 'custom' ? colors.onPrimary : colors.textSecondary}
            />
            <AppText
              variant="callout"
              style={{
                color: when === 'custom' ? colors.onPrimary : colors.text,
                fontWeight: '700',
              }}
            >
              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </AppText>
          </Pressable>
        </View>
      </View>

      {noteVisible ? (
        <TextField
          label="Note"
          value={notes}
          onChangeText={setNotes}
          placeholder="What did you talk about?"
          multiline
          maxLength={300}
          autoFocus
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={noteVisible ? 'Hide note' : 'Add a note'}
          onPress={() => setNoteVisible((value) => !value)}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 52,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Icon name={noteVisible ? 'close' : 'plus'} size={17} color={colors.textSecondary} />
          <AppText variant="callout" style={{ fontWeight: '700' }}>
            {noteVisible ? 'Hide note' : 'Add a note'}
          </AppText>
        </Pressable>
        {last && lastName ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Repeat last contact with ${lastName}`}
            onPress={repeatLast}
            style={({ pressed }) => ({
              flex: 1.45,
              minHeight: 52,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: space.md,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <AppText
              variant="footnote"
              tone="primary"
              numberOfLines={1}
              style={{ fontWeight: '700' }}
            >
              {`Repeat last: ${lastName} · ${last.channel ?? 'contact'} · ${last.duration_minutes ?? 0}`}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 'auto', paddingTop: space.xl }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Button
            label={existing ? 'Save changes' : 'Save contact'}
            loading={saving}
            onPress={save}
          />
        </View>
      </View>

      <CalendarSheet
        visible={calendarVisible}
        value={date}
        onClose={() => setCalendarVisible(false)}
        onSelect={pickCustomDate}
      />
    </Screen>
  );
};

export const GratitudeForm = () => {
  const { addGratitude } = useRelations();
  const { saving, error, setError, submit } = useFormSubmit();
  const [text, setText] = useState('');

  const save = () => {
    if (!text.trim()) {
      setError('Write one thing you are grateful for.');
      return;
    }
    void submit(() => addGratitude.mutateAsync(text));
  };

  return (
    <FormFrame
      title="Gratitude"
      submitLabel="Save entry"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Today I'm grateful for…"
          value={text}
          onChangeText={setText}
          placeholder="A call with an old friend, sunshine on the walk home…"
          multiline
          maxLength={400}
        />
      </View>
    </FormFrame>
  );
};

export const QualityTimeForm = () => {
  const { addQualityTime } = useRelations();
  const { saving, error, setError, submit } = useFormSubmit();
  const [minutes, setMinutes] = useState('');

  const save = () => {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter the minutes you spent.');
      return;
    }
    void submit(() => addQualityTime.mutateAsync(value));
  };

  return (
    <FormFrame
      title="Log quality time"
      submitLabel="Save time"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Minutes"
          value={minutes}
          onChangeText={setMinutes}
          placeholder="60"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
    </FormFrame>
  );
};
