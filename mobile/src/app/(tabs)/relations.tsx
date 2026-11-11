import { router } from 'expo-router';
import { Pressable, RefreshControl, View } from 'react-native';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useRelations } from '@/features/relations/use-relations';
import { daysBetween, formatDate, formatNumber, formatStamp, relativeDay } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

const channelIcon = (channel: string | null): IconName => {
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

  const cadenceFor = (personId: string) => {
    const times = interactions
      .filter((interaction) => interaction.relationship_id === personId)
      .map((interaction) => new Date(interaction.occurred_at).getTime())
      .sort((a, b) => a - b);
    if (times.length < 2) return 30;
    const gaps = times.slice(1).map((time, index) => (time - times[index]) / 86_400_000);
    const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    return Math.max(3, Math.round(average));
  };

  const circle = people.map((person) => {
    const cadence = cadenceFor(person.id);
    const days = person.last_contact_at ? daysBetween(person.last_contact_at) : null;
    return {
      id: person.id,
      name: person.name,
      cadence,
      days,
      overdue: days !== null && days > cadence,
    };
  });
  const inTouch = circle.filter((person) => !person.overdue).length;
  const overdue = circle.filter((person) => person.overdue);

  const addQuickTime = () => {
    addQualityTime.mutate(30, {
      onSuccess: () => {
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
      <PageHeader
        title="Relations"
        date={formatStamp()}
        subtitle="People, contact and gratitude"
      />

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data ? (
        <>
          <Card raised style={{ gap: space.xl }}>
            <StatRow>
              <Stat value={formatNumber(people.length)} label="People" />
              <Stat value={formatNumber(recentMinutes)} label="Minutes, 30d" />
              <Stat
                value={averageMood ? averageMood.toFixed(1) : '—'}
                label="Avg feeling"
              />
            </StatRow>
            <View style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                <AppText variant="callout">Quality time</AppText>
                <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatNumber(qualityDone)} / {formatNumber(qualityTarget)} min
                </AppText>
              </View>
              <Progress value={qualityPct} />
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Button label="Log contact" onPress={() => openAdd('interaction')} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Add 30 min"
                  variant="secondary"
                  onPress={addQuickTime}
                  loading={addQualityTime.isPending}
                />
              </View>
            </View>
          </Card>

          {circle.length > 0 ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Your circle" caption="Who is still within their usual cadence" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
                <RingMeter
                  value={inTouch}
                  max={circle.length}
                  size={116}
                  stroke={9}
                  color={colors.primary}
                  center={`${inTouch}/${circle.length}`}
                  label="In touch"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="headline">
                    {overdue.length === 0 ? 'Everyone is current' : `${overdue.length} overdue`}
                  </AppText>
                  <AppText variant="footnote" tone="secondary">
                    {overdue.length === 0
                      ? 'No one has drifted past their usual cadence.'
                      : `${overdue
                          .slice(0, 3)
                          .map((person) => person.name)
                          .join(', ')}${
                          overdue.length > 3 ? ` and ${overdue.length - 3} more` : ''
                        } — worth a message.`}
                  </AppText>
                </View>
              </View>
            </View>
          ) : null}

          <SectionHeader
            title="People"
            actionLabel="Add"
            onAction={() => openAdd('person')}
          />
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
              {people.map((person, index) => {
                const cadence = cadenceFor(person.id);
                const days = person.last_contact_at ? daysBetween(person.last_contact_at) : null;
                const overdue = days !== null && days > cadence;
                const progress = days === null ? 0 : Math.min(100, (days / cadence) * 100);
                return (
                  <Pressable
                    key={person.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({ pathname: '/add/[form]', params: { form: 'interaction', person: person.id } })
                    }
                    style={({ pressed }) => ({
                      gap: 7,
                      paddingVertical: space.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.separator,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
                      <AppText variant="callout" style={{ flex: 1 }}>
                        {person.name}
                      </AppText>
                      <AppText variant="footnote" tone={overdue ? 'danger' : 'secondary'}>
                        {relativeDay(person.last_contact_at)}
                      </AppText>
                    </View>
                    <Progress value={progress} color={overdue ? colors.danger : colors.primary} />
                    <AppText variant="caption" tone="tertiary">
                      {`Usually every ${cadence} days`}
                    </AppText>
                  </Pressable>
                );
              })}
            </Card>
          )}

          <SectionHeader
            title="Recent contact"
            caption="Last 30 days"
            actionLabel="Log"
            onAction={() => openAdd('interaction')}
          />
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

          <SectionHeader
            title="Gratitude"
            actionLabel="Add"
            onAction={() => openAdd('gratitude')}
          />
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
                <View key={entry.id} style={{ gap: 2 }}>
                  <AppText variant="callout">{entry.text}</AppText>
                  <AppText variant="footnote" tone="tertiary">
                    {formatDate(entry.created_at)}
                  </AppText>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}
