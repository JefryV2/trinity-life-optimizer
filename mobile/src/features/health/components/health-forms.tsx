import { useState } from 'react';
import { View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Slider } from '@/components/ui/slider';
import { TextField } from '@/components/ui/text-field';
import { useHealth } from '@/features/health/use-health';
import { useHeart } from '@/features/heart/use-heart';
import { isoDate } from '@/lib/format';
import { useFormSubmit } from '@/lib/use-form-submit';
import { space } from '@/theme';

const parseNumber = (text: string): number => Number(text.replace(',', '.'));

export const SleepForm = () => {
  const { addSleep } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState(7);
  const [bedtime, setBedtime] = useState(() => {
    const date = new Date();
    date.setHours(23, 0, 0, 0);
    return date;
  });
  const [wake, setWake] = useState(() => {
    const date = new Date();
    date.setHours(7, 0, 0, 0);
    return date;
  });
  const [notes, setNotes] = useState('');

  const save = () => {
    const parsed = parseNumber(hours);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24) {
      setError('Enter how many hours you slept (0–24).');
      return;
    }
    void submit(() =>
      addSleep.mutateAsync({
        hours: parsed,
        quality,
        bedtime: bedtime.toISOString(),
        wakeTime: wake.toISOString(),
        notes,
      }),
    );
  };

  return (
    <FormFrame
      title="Log sleep"
      subtitle="Last night's recovery"
      submitLabel="Save sleep"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <TextField
          label="Hours slept"
          value={hours}
          onChangeText={setHours}
          placeholder="e.g. 7.5"
          keyboardType="decimal-pad"
          maxLength={4}
        />
        <Slider label="Sleep quality" value={quality} onChange={setQuality} min={1} max={10} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <DateTimeField label="Bedtime" value={bedtime} mode="time" onChange={setBedtime} />
          </View>
          <View style={{ flex: 1 }}>
            <DateTimeField label="Wake time" value={wake} mode="time" onChange={setWake} />
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
      </Card>
    </FormFrame>
  );
};

const EXERCISE_TYPES = [
  { value: 'cardio', label: 'Cardio' },
  { value: 'strength', label: 'Strength' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'sport', label: 'Sport' },
];

const INTENSITIES = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

export const ExerciseForm = () => {
  const { addExercise } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [type, setType] = useState('cardio');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [notes, setNotes] = useState('');

  const save = () => {
    const minutes = parseNumber(duration);
    if (!name.trim()) {
      setError('Give the session a name.');
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError('Enter the duration in minutes.');
      return;
    }
    void submit(() =>
      addExercise.mutateAsync({
        name,
        type,
        duration: minutes,
        calories: Number.isFinite(parseNumber(calories)) ? parseNumber(calories) : 0,
        intensity,
        notes,
      }),
    );
  };

  return (
    <FormFrame
      title="Log exercise"
      subtitle="Movement counts double when it's written down"
      submitLabel="Save session"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <TextField
          label="Session"
          value={name}
          onChangeText={setName}
          placeholder="Morning run, push day, yoga…"
          maxLength={80}
        />
        <Chips options={EXERCISE_TYPES} value={type} onChange={setType} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Duration (min)"
              value={duration}
              onChangeText={setDuration}
              placeholder="45"
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Calories (optional)"
              value={calories}
              onChangeText={setCalories}
              placeholder="300"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>
        <Chips options={INTENSITIES} value={intensity} onChange={setIntensity} />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Felt strong, new PB…"
          multiline
          maxLength={300}
        />
      </Card>
    </FormFrame>
  );
};

export const StepsForm = () => {
  const { saveSteps } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [steps, setSteps] = useState('');

  const save = () => {
    const parsed = Math.round(parseNumber(steps));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000) {
      setError('Enter today’s total step count.');
      return;
    }
    void submit(() => saveSteps.mutateAsync(parsed));
  };

  return (
    <FormFrame
      title="Set today's steps"
      subtitle="Replaces today's total — use your watch or phone's count"
      submitLabel="Save steps"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card>
        <TextField
          label="Steps today"
          value={steps}
          onChangeText={setSteps}
          placeholder="e.g. 8500"
          keyboardType="number-pad"
          maxLength={6}
        />
      </Card>
    </FormFrame>
  );
};

const MEALS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export const FoodForm = ({ meal = false }: { meal?: boolean }) => {
  const { addFood } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const save = () => {
    const kcal = parseNumber(calories);
    if (!name.trim()) {
      setError(meal ? 'Name the meal.' : 'Name the food.');
      return;
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      setError('Enter the calorie amount.');
      return;
    }
    const macro = (text: string) => {
      const parsed = parseNumber(text);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };
    void submit(() =>
      addFood.mutateAsync({
        name,
        meal: mealType,
        calories: kcal,
        protein: macro(protein),
        carbs: macro(carbs),
        fat: macro(fat),
      }),
    );
  };

  return (
    <FormFrame
      title={meal ? 'Log a meal' : 'Log food'}
      subtitle={meal ? 'Totals for the whole plate' : 'Search the database from the Nutrition tab, or enter it here'}
      submitLabel={meal ? 'Save meal' : 'Save food'}
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <TextField
          label={meal ? 'Meal name' : 'Food'}
          value={name}
          onChangeText={setName}
          placeholder={meal ? 'Chicken rice bowl' : 'Oat milk latte'}
          maxLength={100}
        />
        <Chips options={MEALS} value={mealType} onChange={setMealType} />
        <TextField
          label="Calories (kcal)"
          value={calories}
          onChangeText={setCalories}
          placeholder="450"
          keyboardType="number-pad"
          maxLength={5}
        />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Protein (g)"
              value={protein}
              onChangeText={setProtein}
              placeholder="0"
              keyboardType="decimal-pad"
              maxLength={5}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Carbs (g)"
              value={carbs}
              onChangeText={setCarbs}
              placeholder="0"
              keyboardType="decimal-pad"
              maxLength={5}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Fat (g)"
              value={fat}
              onChangeText={setFat}
              placeholder="0"
              keyboardType="decimal-pad"
              maxLength={5}
            />
          </View>
        </View>
      </Card>
    </FormFrame>
  );
};

export const MentalForm = () => {
  const { addMental } = useHealth();
  const { saving, error, submit } = useFormSubmit();
  const [mood, setMood] = useState(6);
  const [stress, setStress] = useState(4);
  const [energy, setEnergy] = useState(6);
  const [notes, setNotes] = useState('');

  return (
    <FormFrame
      title="Check in with yourself"
      subtitle="Thirty seconds, honest answers"
      submitLabel="Save check-in"
      loading={saving}
      error={error}
      onSubmit={() =>
        void submit(() => addMental.mutateAsync({ mood, stress, energy, notes }))
      }
    >
      <Card style={{ gap: space.lg }}>
        <Slider label="Mood" value={mood} onChange={setMood} min={1} max={10} formatValue={(v) => `${v}/10`} />
        <Slider label="Stress" value={stress} onChange={setStress} min={1} max={10} formatValue={(v) => `${v}/10`} />
        <Slider label="Energy" value={energy} onChange={setEnergy} min={1} max={10} formatValue={(v) => `${v}/10`} />
        <TextField
          label="What's on your mind? (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="A win, a worry, anything…"
          multiline
          maxLength={500}
        />
      </Card>
    </FormFrame>
  );
};

const FLOWS = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export const CycleForm = () => {
  const { addCycle } = useHealth();
  const { saving, error, submit } = useFormSubmit();
  const [start, setStart] = useState(new Date());
  const [flow, setFlow] = useState('medium');
  const [pain, setPain] = useState(0);
  const [notes, setNotes] = useState('');

  return (
    <FormFrame
      title="Log cycle start"
      subtitle="Predictions get sharper with every cycle"
      submitLabel="Save cycle"
      loading={saving}
      error={error}
      onSubmit={() =>
        void submit(() =>
          addCycle.mutateAsync({ startDate: isoDate(start), flow, pain, notes }),
        )
      }
    >
      <Card style={{ gap: space.lg }}>
        <DateTimeField label="First day" value={start} onChange={setStart} />
        <Chips options={FLOWS} value={flow} onChange={setFlow} />
        <Slider label="Pain level" value={pain} onChange={setPain} min={0} max={10} />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Symptoms, mood, anything worth remembering"
          multiline
          maxLength={300}
        />
      </Card>
    </FormFrame>
  );
};

const GOAL_TYPES = [
  { value: 'steps', label: 'Steps' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'water', label: 'Water' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'weight', label: 'Weight' },
  { value: 'nutrition', label: 'Nutrition' },
];

export const GoalForm = () => {
  const { addGoal } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [type, setType] = useState('steps');

  const save = () => {
    const value = parseNumber(target);
    if (!title.trim()) {
      setError('Name the goal.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Set a target value greater than zero.');
      return;
    }
    void submit(() => addGoal.mutateAsync({ title, target: value, unit: unit.trim() || type, type }));
  };

  return (
    <FormFrame
      title="New health goal"
      subtitle="A number you can actually reach"
      submitLabel="Create goal"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <TextField
          label="Goal"
          value={title}
          onChangeText={setTitle}
          placeholder="Walk 10k steps a day"
          maxLength={100}
        />
        <Chips options={GOAL_TYPES} value={type} onChange={setType} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Target"
              value={target}
              onChangeText={setTarget}
              placeholder="10000"
              keyboardType="decimal-pad"
              maxLength={8}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Unit"
              value={unit}
              onChangeText={setUnit}
              placeholder="steps / hours / ml"
              maxLength={20}
            />
          </View>
        </View>
      </Card>
    </FormFrame>
  );
};

const HEART_CONTEXTS = [
  { value: 'resting', label: 'Resting' },
  { value: 'active', label: 'Active' },
  { value: 'recovery', label: 'Recovery' },
];

export const HeartManualForm = () => {
  const { addManual } = useHeart();
  const { saving, error, setError, submit } = useFormSubmit();
  const [bpm, setBpm] = useState('');
  const [activity, setActivity] = useState('resting');

  const save = () => {
    const value = Math.round(parseNumber(bpm));
    if (!Number.isFinite(value) || value < 30 || value > 230) {
      setError('Enter a heart rate between 30 and 230 bpm.');
      return;
    }
    void submit(() => addManual.mutateAsync({ bpm: value, activity }));
  };

  return (
    <FormFrame
      title="Log heart rate"
      subtitle="From your watch, a manual pulse check, or a connected monitor"
      submitLabel="Save reading"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <TextField
          label="Heart rate (bpm)"
          value={bpm}
          onChangeText={setBpm}
          placeholder="e.g. 64"
          keyboardType="number-pad"
          maxLength={3}
        />
        <Chips options={HEART_CONTEXTS} value={activity} onChange={setActivity} />
      </Card>
    </FormFrame>
  );
};