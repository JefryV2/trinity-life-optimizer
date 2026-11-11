import { View } from 'react-native';

import { Heatmap } from '@/components/charts/heatmap';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeletableRow } from '@/components/ui/deletable-row';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useHealth } from '@/features/health/use-health';
import { formatDate } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space } from '@/theme';

export const MentalSegment = () => {
  const { data, isPending, isError, error, refetch, deleteRecord } = useHealth();

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const latest = data.mental[0];
  const week = data.mental.slice(0, 7);
  const chart = [...week]
    .reverse()
    .map((record) => ({
      label: record.logged_at ? formatDate(record.logged_at) : '—',
      value: record.mood_rating ?? null,
    }));

  return (
    <>
      <Card raised style={{ gap: space.lg }}>
        {latest ? (
          <StatRow>
            <Stat value={String(latest.mood_rating ?? '—')} label="Mood /10" tone={(latest.mood_rating ?? 0) >= 7 ? 'success' : 'default'} />
            <Stat value={String(latest.stress_level ?? '—')} label="Stress /10" tone={(latest.stress_level ?? 0) >= 7 ? 'danger' : 'default'} />
            <Stat value={String(latest.energy_level ?? '—')} label="Energy /10" />
          </StatRow>
        ) : (
          <AppText variant="footnote" tone="secondary">
            No check-ins yet.
          </AppText>
        )}
        <Button label="Check in" onPress={() => openAdd('mental')} />
      </Card>

      {chart.length > 0 ? (
        <Card style={{ gap: space.md }}>
          <SectionHeader title="Mood" caption="Last 7 check-ins" />
          <Heatmap days={chart} />
        </Card>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Journal" />
        {data.mental.length === 0 ? (
          <EmptyState
            icon="brain"
            title="Nothing written yet"
            message="Mood, stress and energy, with a note."
            actionLabel="First check-in"
            onAction={() => openAdd('mental')}
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: space.xl }}>
            {data.mental.map((record, index) => (
              <DeletableRow
                key={record.id}
                icon="brain"
                title={`Mood ${record.mood_rating ?? '—'} · Stress ${record.stress_level ?? '—'} · Energy ${record.energy_level ?? '—'}`}
                subtitle={`${record.logged_at ? formatDate(record.logged_at) : 'Recent'}${record.notes ? ` · ${record.notes}` : ''}`}
                last={index === data.mental.length - 1}
                onDelete={() => deleteRecord.mutate({ table: 'mental_health_logs', id: record.id })}
              />
            ))}
          </Card>
        )}
      </View>
    </>
  );
};