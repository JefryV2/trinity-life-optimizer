import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { useProfile } from '@/features/profile/use-profile';
import { daysBetween, isoDate } from '@/lib/format';
import { ACTIVITY_OPTIONS, calculateCalorieTarget, GOAL_OPTIONS } from '@/lib/health-utils';
import { space } from '@/theme';

const parseNumber = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

export default function ProfileScreen() {
  const { data, isPending, isError, error, refetch, saveProfile, saveHealthProfile } = useProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  const [calories, setCalories] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setFirstName(data.profile?.first_name ?? '');
    setLastName(data.profile?.last_name ?? '');
    setBirthDate(data.health?.birth_date ? new Date(data.health.birth_date) : null);
    setGender(data.health?.gender ?? null);
    setHeight(data.health?.height_cm ? String(data.health.height_cm) : '');
    setWeight(data.health?.weight_kg ? String(data.health.weight_kg) : '');
    setTargetWeight(data.health?.target_weight_kg ? String(data.health.target_weight_kg) : '');
    setActivity(data.health?.activity_level ?? 'moderate');
    setGoal(data.health?.goal_type ?? 'maintain');
    setCalories(data.health?.daily_caloric_target ? String(data.health.daily_caloric_target) : '');
  }, [data]);

  const estimatedCalories = useMemo(() => {
    const heightCm = parseNumber(height);
    const weightKg = parseNumber(weight);
    if (!birthDate || !heightCm || !weightKg) return null;
    const age = Math.max(13, Math.floor(daysBetween(birthDate) / 365.25));
    return calculateCalorieTarget({ gender, age, heightCm, weightKg, activityLevel: activity, goalType: goal });
  }, [activity, birthDate, gender, goal, height, weight]);

  const save = async () => {
    setMessage(null);
    const heightCm = parseNumber(height);
    const weightKg = parseNumber(weight);
    const targetWeightKg = parseNumber(targetWeight);
    const dailyCalories = parseNumber(calories) ?? estimatedCalories;
    try {
      await saveProfile.mutateAsync({ firstName, lastName });
      await saveHealthProfile.mutateAsync({
        birthDate: birthDate ? isoDate(birthDate) : null,
        gender,
        heightCm,
        weightKg,
        targetWeightKg,
        activityLevel: activity,
        goalType: goal,
        dailyCalories,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessage('Profile saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save profile.');
    }
  };

  return (
    <Screen safeAreaTop={false}>
      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      <SectionHeader title="Identity" caption="Used across the dashboard and reports" />
      <Card style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField label="First name" value={firstName} onChangeText={setFirstName} maxLength={40} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Last name" value={lastName} onChangeText={setLastName} maxLength={40} />
          </View>
        </View>
        <DateTimeField label="Birth date" value={birthDate ?? new Date(1990, 0, 1)} onChange={setBirthDate} />
        <Chips options={GENDERS} value={gender} onChange={setGender} />
      </Card>

      <SectionHeader title="Body metrics" caption="Nutrition targets use these values" />
      <Card style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField label="Height cm" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={6} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Weight kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={6} />
          </View>
        </View>
        <TextField label="Target weight kg" value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" maxLength={6} />
        <Chips options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
        <Chips options={GOAL_OPTIONS} value={goal} onChange={setGoal} />
        <TextField
          label="Daily calorie target"
          value={calories}
          onChangeText={setCalories}
          placeholder={estimatedCalories ? String(estimatedCalories) : '2000'}
          keyboardType="number-pad"
          maxLength={5}
          helper={estimatedCalories ? `Estimated from your profile: ${estimatedCalories} kcal` : undefined}
        />
        {estimatedCalories ? (
          <Button label="Use estimated target" variant="soft" onPress={() => setCalories(String(estimatedCalories))} />
        ) : null}
      </Card>

      {message ? (
        <AppText variant="footnote" tone={message === 'Profile saved.' ? 'secondary' : 'danger'}>
          {message}
        </AppText>
      ) : null}
      <Button label="Save profile" onPress={save} loading={saveProfile.isPending || saveHealthProfile.isPending} />
    </Screen>
  );
}