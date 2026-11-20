import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useRelations } from '@/features/relations/use-relations';
import { daysBetween, formatDate, formatNumber, relativeDay } from '@/lib/format';
import { openEdit } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

const humanise = (value: string) =>
  value
    .replace(/[-_]/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());

const importanceLabel = (value: number | null) =>
  ['Acquaintance', 'Casual', 'Close', 'Core', 'Inner circle'][Math.min(4, Math.max(0, (value ?? 3) - 1))];

export default function PersonDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending } = useRelations();
  const person = data?.relationships.find((item) => item.id === id);

  if (isPending) {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.xl }}>
        <BackLink fallback="/(tabs)/relations" />
        <LoadingState rows={3} />
      </Screen>
    );
  }

  if (!person) {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.xl }}>
        <BackLink fallback="/(tabs)/relations" />
        <EmptyState
          icon="people"
          title="Person not found"
          message="They may have been removed."
          actionLabel="Back to People"
          onAction={() => router.replace('/(tabs)/relations' as never)}
        />
      </Screen>
    );
  }

  const interactions = (data?.interactions ?? [])
    .filter((interaction) => interaction.relationship_id === person.id)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  const days = person.last_contact_at ? daysBetween(person.last_contact_at) : null;
  const gaps = interactions
    .slice(1)
    .map((item, index) => (new Date(interactions[index].occurred_at).getTime() - new Date(item.occurred_at).getTime()) / 86_400_000);
  const cadence = gaps.length ? Math.max(3, Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)) : 30;
  const logContact = () =>
    router.push({ pathname: '/add/[form]', params: { form: 'interaction', person: person.id } });
  const progress = days === null ? 0 : Math.min(100, (days / cadence) * 100);
  const minutes = interactions.reduce((sum, item) => sum + Number(item.duration_minutes ?? 0), 0);
  const mood = interactions.length
    ? interactions.reduce((sum, item) => sum + Number(item.mood_rating ?? 0), 0) / interactions.length
    : null;

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <PageHeader back="/(tabs)/relations" title={person.name} date={person.relation_type ? humanise(person.relation_type) : 'Person'} />

      <Card style={{ gap: space.lg }}>
        <StatRow>
          <Stat value={formatNumber(interactions.length)} label="Contacts" />
          <Stat value={`${formatNumber(minutes)} min`} label="Time" />
          <Stat value={mood ? mood.toFixed(1) : '—'} label="Avg feeling" />
        </StatRow>
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="callout">{relativeDay(person.last_contact_at)}</AppText>
            <AppText variant="footnote" tone="tertiary">
              {importanceLabel(person.importance)}
            </AppText>
          </View>
          <Progress value={progress} color={progress >= 100 ? colors.danger : colors.bonds} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Button label="Log contact" onPress={() => logContact()} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Edit person" variant="secondary" onPress={() => openEdit('person', person.id)} />
          </View>
        </View>
        {person.notes ? (
          <AppText variant="footnote" tone="secondary">
            {person.notes}
          </AppText>
        ) : null}
      </Card>

      <SectionHeader title="History" caption={`${interactions.length} contacts`} />
      {interactions.length === 0 ? (
        <EmptyState
          icon="message"
          title="No contact yet"
          message="Log the first call, visit or message."
          actionLabel="Log contact"
          onAction={() => logContact()}
        />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          {interactions.map((interaction, index) => (
            <ListRow
              key={interaction.id}
              title={interaction.channel ? humanise(interaction.channel) : 'Contact'}
              subtitle={`${formatDate(interaction.occurred_at)}${interaction.notes ? ` · ${interaction.notes}` : ''}`}
              value={`${formatNumber(Number(interaction.duration_minutes ?? 0))} min`}
              onPress={() => openEdit('interaction', interaction.id)}
              last={index === interactions.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
