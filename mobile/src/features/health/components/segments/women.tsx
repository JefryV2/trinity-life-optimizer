import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { View } from 'react-native';

import { ScoreRing } from '@/components/charts/score-ring';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips, MultiChips } from '@/components/ui/chips';
import { DeletableRow } from '@/components/ui/deletable-row';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { useHealth } from '@/features/health/use-health';
import { useWomensDaily } from '@/features/health/womens-daily';
import { addDays, daysBetween, formatDate, isoDate } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { useFormSubmit } from '@/lib/use-form-submit';
import { space, useTheme } from '@/theme';

const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Acne', 'Back pain', 'Cravings', 'Insomnia'];
const MOODS = ['Happy', 'Calm', 'Energetic', 'Sad', 'Anxious', 'Irritable', 'Mood swings'];
const FLOWS = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

const phaseFor = (day: number): { name: string; note: string } => {
  if (day <= 5) return { name: 'Menstrual', note: 'Rest and warmth. Iron-rich food helps.' };
  if (day <= 13) return { name: 'Follicular', note: 'Energy climbs — good days for hard training.' };
  if (day <= 16) return { name: 'Ovulation', note: 'Peak energy and fertility window.' };
  return { name: 'Luteal', note: 'Wind down gradually; prioritize sleep and steady meals.' };
};

export const WomenSegment = () => {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();
  const { data: dailyData, saveLog, todayLog } = useWomensDaily();
  const { saving, error: saveError, submit } = useFormSubmit();

  const [logVisible, setLogVisible] = useState(false);
  const [flow, setFlow] = useState<string | null>(todayLog?.flow_intensity ?? null);
  const [moods, setMoods] = useState<string[]>(todayLog?.moods ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(todayLog?.symptoms ?? []);
  const [pain, setPain] = useState(todayLog?.pain_level ?? 0);
  const [notes, setNotes] = useState(todayLog?.notes ?? '');

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const cycles = data.cycles;
  const lastStart = cycles[0]?.cycle_start_date ?? null;

  const lengths = cycles
    .slice(0, -1)
    .map((cycle, index) => daysBetween(cycles[index + 1].cycle_start_date, cycle.cycle_start_date))
    .filter((length) => length >= 21 && length <= 45);
  const avgLength = lengths.length
    ? Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length)
    : 28;

  const cycleDay = lastStart ? daysBetween(lastStart) + 1 : null;
  const phase = cycleDay ? phaseFor(((cycleDay - 1) % avgLength) + 1) : null;
  const nextPeriod = lastStart ? addDays(new Date(lastStart + 'T12:00:00'), avgLength) : null;
  const daysUntil = nextPeriod
    ? Math.ceil((nextPeriod.getTime() - Date.now()) / 86_400_000)
    : null;
  const ovulation = nextPeriod ? addDays(nextPeriod, -14) : null;

  const openDailyLog = () => {
    setFlow(todayLog?.flow_intensity ?? null);
    setMoods(todayLog?.moods ?? []);
    setSymptoms(todayLog?.symptoms ?? []);
    setPain(todayLog?.pain_level ?? 0);
    setNotes(todayLog?.notes ?? '');
    setLogVisible(true);
  };

  const saveDaily = () => {
    void submit(async () => {
      await saveLog.mutateAsync({ date: isoDate(), flow, moods, symptoms, pain, notes });
      setLogVisible(false);
    });
  };

  return (
    <>
      {lastStart && cycleDay && phase ? (
        <Card raised style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
          <ScoreRing
            score={(((cycleDay - 1) % avgLength) / avgLength) * 100}
            size={104}
            stroke={9}
            color={colors.accent}
            label={`Day ${cycleDay}`}
          />
          <View style={{ flex: 1, gap: space.xs }}>
            <AppText variant="headline">{phase.name} phase</AppText>
            <AppText variant="footnote" tone="secondary">
              {phase.note}
            </AppText>
            {daysUntil !== null ? (
              <AppText variant="caption" tone="primary" style={{ fontWeight: '600' }}>
                {daysUntil > 0
                  ? `Next period in ~${daysUntil} day${daysUntil === 1 ? '' : 's'}`
                  : daysUntil === 0
                    ? 'Period expected today'
                    : `Period is ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} late — log the start when it comes`}
              </AppText>
            ) : null}
            {ovulation ? (
              <AppText variant="caption" tone="tertiary">
                Estimated fertile window:{' '}
                {formatDate(addDays(ovulation, -5))} – {formatDate(addDays(ovulation, 1))}
              </AppText>
            ) : null}
          </View>
        </Card>
      ) : (
        <EmptyState
          icon="female"
          title="Track your cycle"
          message="Log the first day of your last period and Trinity will estimate phases, fertility and the next cycle."
          actionLabel="Log cycle start"
          onAction={() => openAdd('cycle')}
        />
      )}

      <Card style={{ gap: space.md }}>
        <SectionHeader
          title="Today"
          caption={todayLog ? 'Logged — tap to update' : 'How is your body today?'}
          actionLabel={todayLog ? 'Update' : 'Log'}
          onAction={openDailyLog}
        />
        {todayLog ? (
          <View style={{ gap: space.xs }}>
            <AppText variant="footnote" tone="secondary">
              Flow: {todayLog.flow_intensity ?? 'not set'} · Pain: {todayLog.pain_level ?? 0}/10
            </AppText>
            {todayLog.symptoms?.length ? (
              <AppText variant="caption" tone="tertiary">
                {todayLog.symptoms.join(' · ')}
              </AppText>
            ) : null}
            {todayLog.moods?.length ? (
              <AppText variant="caption" tone="tertiary">
                Mood: {todayLog.moods.join(', ')}
              </AppText>
            ) : null}
          </View>
        ) : (
          <Button label="Log symptoms & mood" variant="soft" size="small" onPress={openDailyLog} />
        )}
        {dailyData?.available === false ? (
          <AppText variant="caption" tone="tertiary">
            Daily logs are not enabled on this database yet — cycle tracking still works.
          </AppText>
        ) : null}
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Cycle history"
          caption={`Average length: ${avgLength} days`}
          actionLabel="Add"
          onAction={() => openAdd('cycle')}
        />
        {cycles.length === 0 ? (
          <Card>
            <ListRow title="No cycles recorded" subtitle="Predictions improve with every logged cycle" />
          </Card>
        ) : (
          <Card padded={false} style={{ paddingHorizontal: space.xl }}>
            {cycles.map((cycle, index) => (
              <DeletableRow
                key={cycle.id}
                icon="female"
                title={formatDate(cycle.cycle_start_date)}
                subtitle={`${cycle.flow_intensity ?? 'unknown'} flow${cycle.pain_level ? ` · pain ${cycle.pain_level}/10` : ''}`}
                value={cycle.cycle_end_date ? `→ ${formatDate(cycle.cycle_end_date)}` : undefined}
                last={index === cycles.length - 1}
                onDelete={() => deleteRecord.mutate({ table: 'menstrual_cycles', id: cycle.id })}
              />
            ))}
          </Card>
        )}
      </View>

      <Sheet
        visible={logVisible}
        title="Daily log"
        subtitle={formatDate(new Date())}
        onClose={() => setLogVisible(false)}
        footer={
          <Button label="Save today's log" loading={saving} onPress={saveDaily} />
        }
      >
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" tone="secondary">
            Flow
          </AppText>
          <Chips options={FLOWS} value={flow} onChange={setFlow} />
        </View>
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" tone="secondary">
            Symptoms
          </AppText>
          <MultiChips
            options={SYMPTOMS.map((symptom) => ({ value: symptom, label: symptom }))}
            values={symptoms}
            onChange={setSymptoms}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" tone="secondary">
            Mood
          </AppText>
          <MultiChips
            options={MOODS.map((mood) => ({ value: mood, label: mood }))}
            values={moods}
            onChange={setMoods}
          />
        </View>
        <Slider label="Pain" value={pain} onChange={setPain} min={0} max={10} />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else worth remembering"
          multiline
          maxLength={300}
        />
        {saveError ? (
          <AppText variant="footnote" tone="danger">
            {saveError}
          </AppText>
        ) : null}
      </Sheet>
    </>
  );
};