import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { Chips } from '@/components/ui/chips';
import { RecentChips } from '@/components/ui/recent-chips';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Slider } from '@/components/ui/slider';
import { TextField } from '@/components/ui/text-field';
import { useHealth } from '@/features/health/use-health';
import { useRecentFoods } from '@/features/health/use-recent-foods';
import { useHeart } from '@/features/heart/use-heart';
import { isoDate } from '@/lib/format';
import { useFormSubmit } from '@/lib/use-form-submit';
import { space } from '@/theme';

const parseNumber = (text: string): number => Number(text.replace(',', '.'));

export const SleepForm = ({ recordId }: { recordId?: string }) => {
  const { data, addSleep, updateSleep } = useHealth();
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
  const existing = data?.sleep.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setHours(existing.sleep_duration_hours ? String(existing.sleep_duration_hours) : '');
    setQuality(existing.sleep_quality ?? 7);
    if (existing.bedtime) setBedtime(new Date(existing.bedtime));
    if (existing.wake_time) setWake(new Date(existing.wake_time));
    setNotes(existing.notes ?? '');
  }, [existing?.id]);

  const save = () => {
    const parsed = parseNumber(hours);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24) {
      setError('Enter how many hours you slept (0–24).');
      return;
    }
    const input = {
      hours: parsed,
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
    <FormFrame
      title={existing ? 'Edit sleep' : 'Log sleep'}
      subtitle={existing ? undefined : 'Last night'}
      submitLabel={existing ? 'Save changes' : 'Save sleep'}
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
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
      </View>
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

export const ExerciseForm = ({ recordId }: { recordId?: string }) => {
  const { data, addExercise, updateExercise } = useHealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [type, setType] = useState('cardio');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());

  const existing = data?.exercise.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setName(existing.exercise_name);
    setType(existing.exercise_type ?? 'cardio');
    setDuration(existing.duration_minutes ? String(existing.duration_minutes) : '');
    setCalories(existing.calories_burned ? String(existing.calories_burned) : '');
    setIntensity(existing.intensity ?? 'moderate');
    setNotes(existing.notes ?? '');
    if (existing.completed_at) setDate(new Date(existing.completed_at));
  }, [existing?.id]);

  const recent = Array.from(
    new Map(
      (data?.exercise ?? []).map((entry) => [
        entry.exercise_name,
        {
          name: entry.exercise_name,
          type: entry.exercise_type ?? 'cardio',
          duration: entry.duration_minutes,
          calories: entry.calories_burned,
          intensity: entry.intensity ?? 'moderate',
        },
      ]),
    ).values(),
  ).slice(0, 4);

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
    const input = {
      name,
      type,
      duration: minutes,
      calories: Number.isFinite(parseNumber(calories)) ? parseNumber(calories) : 0,
      intensity,
      notes,
      completedAt: date.toISOString(),
    };
    void submit(() =>
      existing ? updateExercise.mutateAsync({ id: existing.id, ...input }) : addExercise.mutateAsync(input),
    );
  };

  return (
    <FormFrame
      title={existing ? 'Edit exercise' : 'Log exercise'}
      submitLabel={existing ? 'Save changes' : 'Save session'}
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <RecentChips
          options={recent.map((entry) => ({
            key: entry.name,
            label: entry.name,
            onPress: () => {
              setName(entry.name);
              setType(entry.type);
              setDuration(entry.duration ? String(entry.duration) : '');
              setCalories(entry.calories ? String(entry.calories) : '');
              setIntensity(entry.intensity);
            },
          }))}
        />
        <TextField
          label="Session"
          value={name}
          onChangeText={setName}
          placeholder="Morning run, push day, yoga…"
          maxLength={80}
        />
        <Chips label="Type" options={EXERCISE_TYPES} value={type} onChange={setType} />
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
        <Chips label="Intensity" options={INTENSITIES} value={intensity} onChange={setIntensity} />
        <DateTimeField label="When" value={date} onChange={setDate} />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Felt strong, new PB…"
          multiline
          maxLength={300}
        />
      </View>
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
      subtitle="Replaces today's total"
      submitLabel="Save steps"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Steps today"
          value={steps}
          onChangeText={setSteps}
          placeholder="e.g. 8500"
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>
    </FormFrame>
  );
};

const MEALS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export const FoodForm = ({ meal = false, recordId }: { meal?: boolean; recordId?: string }) => {
  const { data, addFood, updateFood } = useHealth();
  const recentFoods = useRecentFoods();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const existing = data?.food.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setName(existing.food_name);
    setMealType(existing.meal_type ?? 'lunch');
    setCalories(existing.total_calories !== null ? String(Math.round(existing.total_calories)) : '');
    setProtein(existing.protein_g !== null ? String(existing.protein_g) : '');
    setCarbs(existing.carbs_g !== null ? String(existing.carbs_g) : '');
    setFat(existing.fat_g !== null ? String(existing.fat_g) : '');
    setFiber(existing.fiber_g !== null && existing.fiber_g !== undefined ? String(existing.fiber_g) : '');
    setSugar(existing.sugar_g !== null && existing.sugar_g !== undefined ? String(existing.sugar_g) : '');
    setSodium(existing.sodium_mg !== null && existing.sodium_mg !== undefined ? String(existing.sodium_mg) : '');
    setNotes(existing.notes ?? '');
    if (existing.consumed_at) setDate(new Date(existing.consumed_at));
  }, [existing?.id]);

  const recent = Array.from(
    new Map(
      (recentFoods.data ?? []).map((entry) => [entry.food_name.toLowerCase(), entry]),
    ).values(),
  ).slice(0, 5);

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
    const input = {
      name,
      meal: mealType,
      calories: kcal,
      protein: macro(protein),
      carbs: macro(carbs),
      fat: macro(fat),
      fiber: macro(fiber),
      sugar: macro(sugar),
      sodium: macro(sodium),
      notes,
      components: existing?.components,
      occurredAt: date.toISOString(),
    };
    void submit(() =>
      existing ? updateFood.mutateAsync({ id: existing.id, ...input }) : addFood.mutateAsync(input),
    );
  };

  return (
    <FormFrame
      title={existing ? (meal ? 'Edit meal' : 'Edit food') : meal ? 'Log a meal' : 'Log food'}
      subtitle={existing || meal ? undefined : 'Values from the label'}
      submitLabel={existing ? 'Save changes' : meal ? 'Save meal' : 'Save food'}
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <RecentChips
          options={recent.map((entry) => ({
            key: entry.food_name,
            label: `${entry.food_name} · ${Math.round(entry.total_calories ?? 0)} kcal`,
            onPress: () => {
              setName(entry.food_name);
              setCalories(String(Math.round(entry.total_calories ?? 0)));
              setProtein(String(Math.round(entry.protein_g ?? 0)));
              setCarbs(String(Math.round(entry.carbs_g ?? 0)));
              setFat(String(Math.round(entry.fat_g ?? 0)));
              setFiber(String(Math.round(entry.fiber_g ?? 0)));
              setSugar(String(Math.round(entry.sugar_g ?? 0)));
              setSodium(String(Math.round(entry.sodium_mg ?? 0)));
            },
          }))}
        />
        <TextField
          label={meal ? 'Meal name' : 'Food'}
          value={name}
          onChangeText={setName}
          placeholder={meal ? 'Chicken rice bowl' : 'Oat milk latte'}
          maxLength={100}
        />
        <Chips label="Meal" options={MEALS} value={mealType} onChange={setMealType} />
        <DateTimeField label="When" value={date} onChange={setDate} />
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
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField label="Fiber (g)" value={fiber} onChangeText={setFiber} placeholder="0" keyboardType="decimal-pad" maxLength={5} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Sugar (g)" value={sugar} onChangeText={setSugar} placeholder="0" keyboardType="decimal-pad" maxLength={5} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Sodium (mg)" value={sodium} onChangeText={setSodium} placeholder="0" keyboardType="number-pad" maxLength={6} />
          </View>
        </View>
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Components, sauce, portion…"
          multiline
          maxLength={300}
        />
      </View>
    </FormFrame>
  );
};

export const MentalForm = ({ recordId }: { recordId?: string }) => {
  const { data, addMental, updateMental } = useHealth();
  const { saving, error, submit } = useFormSubmit();
  const [mood, setMood] = useState(6);
  const [stress, setStress] = useState(4);
  const [energy, setEnergy] = useState(6);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const existing = data?.mental.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setMood(existing.mood_rating ?? 6);
    setStress(existing.stress_level ?? 4);
    setEnergy(existing.energy_level ?? 6);
    setNotes(existing.notes ?? '');
    if (existing.logged_at) setDate(new Date(existing.logged_at));
  }, [existing?.id]);

  return (
    <FormFrame
      title={existing ? 'Edit check-in' : 'Check in'}
      submitLabel={existing ? 'Save changes' : 'Save check-in'}
      loading={saving}
      error={error}
      onSubmit={() =>
        void submit(() => {
          const input = { mood, stress, energy, notes, loggedAt: date.toISOString() };
          return existing
            ? updateMental.mutateAsync({ id: existing.id, ...input })
            : addMental.mutateAsync(input);
        })
      }
    >
      <View style={{ gap: space.xl }}>
        <DateTimeField label="When" value={date} onChange={setDate} />
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
      </View>
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
      submitLabel="Save cycle"
      loading={saving}
      error={error}
      onSubmit={() =>
        void submit(() =>
          addCycle.mutateAsync({ startDate: isoDate(start), flow, pain, notes }),
        )
      }
    >
      <View style={{ gap: space.xl }}>
        <DateTimeField label="First day" value={start} onChange={setStart} />
        <Chips label="Flow" options={FLOWS} value={flow} onChange={setFlow} />
        <Slider label="Pain level" value={pain} onChange={setPain} min={0} max={10} />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Symptoms, mood, anything worth remembering"
          multiline
          maxLength={300}
        />
      </View>
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
      submitLabel="Create goal"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Goal"
          value={title}
          onChangeText={setTitle}
          placeholder="Walk 10k steps a day"
          maxLength={100}
        />
        <Chips label="Type" options={GOAL_TYPES} value={type} onChange={setType} />
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
      </View>
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
      subtitle="Manual pulse check"
      submitLabel="Save reading"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Heart rate (bpm)"
          value={bpm}
          onChangeText={setBpm}
          placeholder="e.g. 64"
          keyboardType="number-pad"
          maxLength={3}
        />
        <Chips label="Context" options={HEART_CONTEXTS} value={activity} onChange={setActivity} />
      </View>
    </FormFrame>
  );
};