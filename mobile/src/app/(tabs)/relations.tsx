import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useRelations } from '@/features/relations/use-relations';
import { formatDate, formatNumber, relativeDay } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

const channelIcon = (channel: string | null) => {
  if (channel === 'call') return 'phone';
  if (channel === 'video') return 'video';
  if (channel === 'text') return 'message';
  return 'people';
};

export default function RelationsScreen() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching, addQualityTime } = useRelations();

  const people = data?.relationships ?? [];
  const interactions = data?.interactions ?? [];
  const gratitude = data?.gratitude ?? [];
  const qualityTarget = data?.qualityTime?.target_minutes_per_week ?? 300;
  const qualityDone = data?.qualityTime?.completed_minutes ?? 0;
  const qualityPct = qualityTarget > 0 ? (qualityDone / qualityTarget) * 100 : 0;
  const recentMinutes = interactions.reduce((total, interaction) => total + Number(interaction.duration_minutes ?? 0), 0);
  const averageMood = interactions.length
    ? interactions.reduce((total, interaction) => total + Number(interaction.mood_rating ?? 0), 0) / interactions.length
    : 0;
  const personName = new Map(people.map((person) => [person.id, person.name]));

  const addQuickTime = () => {
    addQualityTime.mutate(30, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={{ gap: 2 }}>
        <AppText variant="title">Relations</AppText>
        <AppText variant="footnote" tone="secondary">
          People, meaningful contact, gratitude, and quality time.
        </AppText>
      </View>

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data ? (
        <>
          <Card raised style={{ gap: space.lg }}>
            <StatRow>
              <Stat value={formatNumber(people.length)} label="People" tone="primary" />
              <Stat value={formatNumber(recentMinutes)} label="Minutes / 30d" />
              <Stat value={averageMood ? averageMood.toFixed(1) : '—'} label="Avg feeling" tone="success" />
            </StatRow>
            <View style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="callout">Quality time goal</AppText>
                <AppText variant="footnote" tone="secondary">
                  {formatNumber(qualityDone)} / {formatNumber(qualityTarget)} min
                </AppText>
              </View>
              <Progress value={qualityPct} color={colors.success} />
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Button label="Log contact" onPress={() => openAdd('interaction')} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="+30 min" variant="secondary" onPress={addQuickTime} loading={addQualityTime.isPending} />
              </View>
            </View>
          </Card>

          <SectionHeader title="People" caption="Tap a person to log contact" actionLabel="Add" onAction={() => openAdd('person')} />
          {people.length === 0 ? (
            <EmptyState
              icon="people"
              title="No people yet"
              message="Add the people who matter so contact quality can become visible."
              actionLabel="Add person"
              onAction={() => openAdd('person')}
            />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              {people.map((person, index) => (
                <ListRow
                  key={person.id}
                  icon="user"
                  title={person.name}
                  subtitle={`${person.relation_type ?? 'Relationship'} · ${relativeDay(person.last_contact_at)}`}
                  value={person.importance ? `Importance ${person.importance}/5` : undefined}
                  onPress={() => router.push({ pathname: '/add/[form]', params: { form: 'interaction', person: person.id } })}
                  last={index === people.length - 1}
                />
              ))}
            </Card>
          )}

          <SectionHeader title="Recent contact" caption="Last 30 days" actionLabel="Log" onAction={() => openAdd('interaction')} />
          {interactions.length === 0 ? (
            <EmptyState
              icon="message"
              title="No contact logged"
              message="Log calls, visits, texts, or video chats to see relationship momentum."
              actionLabel="Log contact"
              onAction={() => openAdd('interaction')}
            />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              {interactions.slice(0, 12).map((interaction, index) => (
                <ListRow
                  key={interaction.id}
                  icon={channelIcon(interaction.channel)}
                  title={personName.get(interaction.relationship_id) ?? 'Someone'}
                  subtitle={`${interaction.channel ?? 'Contact'} · ${formatDate(interaction.occurred_at)}${interaction.notes ? ` · ${interaction.notes}` : ''}`}
                  value={`${formatNumber(Number(interaction.duration_minutes ?? 0))} min`}
                  last={index === Math.min(interactions.length, 12) - 1}
                />
              ))}
            </Card>
          )}

          <SectionHeader title="Gratitude" caption="Recent entries" actionLabel="Add" onAction={() => openAdd('gratitude')} />
          {gratitude.length === 0 ? (
            <EmptyState
              icon="gift"
              title="No gratitude entries"
              message="Write one good thing from today to strengthen the relations pillar."
              actionLabel="Add gratitude"
              onAction={() => openAdd('gratitude')}
            />
          ) : (
            <Card style={{ gap: space.md }}>
              {gratitude.slice(0, 5).map((entry) => (
                <View key={entry.id} style={{ gap: space.xs }}>
                  <AppText variant="callout">{entry.text}</AppText>
                  <AppText variant="caption" tone="tertiary">
                    {formatDate(entry.created_at)}
                  </AppText>
                </View>
              ))}
              <Button label="Add gratitude" variant="soft" onPress={() => openAdd('gratitude')} icon={<Icon name="plus" size={18} color={colors.primary} />} />
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}