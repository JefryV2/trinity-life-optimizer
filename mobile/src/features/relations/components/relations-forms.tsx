import { useState } from 'react';
import { View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { AppText } from '@/components/ui/app-text';
import { Chips } from '@/components/ui/chips';
import { Slider } from '@/components/ui/slider';
import { TextField } from '@/components/ui/text-field';
import { useRelations } from '@/features/relations/use-relations';
import { useFormSubmit } from '@/lib/use-form-submit';
import { space } from '@/theme';

const RELATION_TYPES = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'partner', label: 'Partner' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' },
];

export const PersonForm = () => {
  const { addRelationship } = useRelations();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [type, setType] = useState('friend');
  const [importance, setImportance] = useState(3);
  const [notes, setNotes] = useState('');

  const save = () => {
    if (!name.trim()) {
      setError('Who is this person?');
      return;
    }
    void submit(() => addRelationship.mutateAsync({ name, type, importance, notes }));
  };

  return (
    <FormFrame
      title="Add a person"
      submitLabel="Add person"
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

export const InteractionForm = ({ personId }: { personId?: string }) => {
  const { data, logInteraction } = useRelations();
  const { saving, error, setError, submit } = useFormSubmit();
  const people = data?.relationships ?? [];
  const [relationshipId, setRelationshipId] = useState<string | null>(personId ?? null);
  const [channel, setChannel] = useState('in_person');
  const [duration, setDuration] = useState('');
  const [mood, setMood] = useState(7);
  const [notes, setNotes] = useState('');

  const save = () => {
    const minutes = Number(duration);
    if (!relationshipId) {
      setError('Pick who you spent time with.');
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError('How many minutes did it last?');
      return;
    }
    void submit(() =>
      logInteraction.mutateAsync({ relationshipId, channel, duration: minutes, mood, notes }),
    );
  };

  return (
    <FormFrame
      title="Log contact"
      submitLabel="Save contact"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        {people.length > 0 ? (
          <Chips
            label="Person"
            options={people.map((person) => ({ value: person.id, label: person.name }))}
            value={relationshipId}
            onChange={setRelationshipId}
          />
        ) : (
          <AppText variant="footnote" tone="secondary">
            Add a person first from the Relations tab.
          </AppText>
        )}
        <Chips label="Channel" options={CHANNELS} value={channel} onChange={setChannel} />
        <TextField
          label="Duration (minutes)"
          value={duration}
          onChangeText={setDuration}
          placeholder="30"
          keyboardType="number-pad"
          maxLength={4}
        />
        <Slider label="Feeling" value={mood} onChange={setMood} min={1} max={10} />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="What did you talk about?"
          multiline
          maxLength={300}
        />
      </View>
    </FormFrame>
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