import { router } from 'expo-router';
import { Platform, Pressable, RefreshControl, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { RingMeter } from '@/components/charts/ring-meter';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import type { IconName } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useCallSync } from '@/features/relations/call-sync-provider';
import { useRelations } from '@/features/relations/use-relations';
import { daysBetween, formatDate, formatNumber, formatStamp, relativeDay } from '@/lib/format';
import { openAdd, openEdit } from '@/lib/navigation';
import { fonts, radius, space, useTheme } from '@/theme';

const channelIcon = (channel: string | null): IconName => {
  if (channel === 'call') return 'phone';
  if (channel === 'video') return 'video';
  if (channel === 'text') return 'message';
  return 'people';
};

const channelLabel = (channel: string | null) => {
  if (channel === 'in_person') return 'In person';
  if (!channel) return 'Contact';
  return channel.charAt(0).toUpperCase() + channel.slice(1);
};

const personInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

const PersonAvatar = ({
  name,
  days,
  cadence,
  color,
  size = 52,
}: {
  name: string;
  days: number | null;
  cadence: number;
  color: string;
  size?: number;
}) => {
  const { colors } = useTheme();
  const stroke = 2.5;
  const mid = size / 2;
  const radiusValue = mid - stroke;
  const circumference = 2 * Math.PI * radiusValue;
  const ratio =
    days === null ? 0 : days === 0 ? 0.035 : Math.max(0, Math.min(1, days / Math.max(1, cadence)));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={mid}
          cy={mid}
          r={radiusValue}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={mid}
          cy={mid}
          r={radiusValue}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - ratio * circumference}
          rotation={-90}
          origin={`${mid}, ${mid}`}
        />
      </Svg>
      <View
        style={{
          width: size - 13,
          height: size - 13,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceSunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText
          style={{
            fontFamily: fonts.semibold,
            fontSize: 17,
            lineHeight: 20,
            letterSpacing: -0.3,
            color: colors.textSecondary,
          }}
        >
          {personInitials(name)}
        </AppText>
      </View>
    </View>
  );
};

export default function PeopleScreen() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching, addQualityTime } = useRelations();
  const callSync = useCallSync();

  const people = data?.relationships ?? [];
  const interactions = data?.interactions ?? [];
  const qualityTarget = data?.qualityTime?.target_minutes_per_week ?? 300;
  const qualityDone = data?.qualityTime?.completed_minutes ?? 0;
  const qualityPct = qualityTarget > 0 ? (qualityDone / qualityTarget) * 100 : 0;
  const qualityLeft = Math.max(0, qualityTarget - qualityDone);
  const recentMinutes = interactions.reduce(
    (total, interaction) => total + Number(interaction.duration_minutes ?? 0),
    0,
  );
  const averageMood = interactions.length
    ? interactions.reduce(
        (total, interaction) => total + Number(interaction.mood_rating ?? 0),
        0,
      ) / interactions.length
    : 0;

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

  const circle = people
    .map((person) => {
      const cadence = cadenceFor(person.id);
      const days = person.last_contact_at ? daysBetween(person.last_contact_at) : null;
      const remaining = days === null ? null : cadence - days;
      const overdue = remaining !== null && remaining < 0;
      const tint =
        days === 0
          ? colors.primary
          : remaining !== null && remaining <= 1
            ? colors.amber
            : colors.bonds;
      return {
        id: person.id,
        name: person.name,
        cadence,
        days,
        remaining,
        overdue,
        tint,
        lastContactAt: person.last_contact_at,
      };
    })
    .sort((a, b) => {
      if (a.remaining === null && b.remaining === null) return a.name.localeCompare(b.name);
      if (a.remaining === null) return 1;
      if (b.remaining === null) return -1;
      return a.remaining - b.remaining;
    });

  const inTouch = circle.filter((person) => !person.overdue).length;
  const featured =
    circle.find(
      (person) => person.id === interactions[0]?.relationship_id,
    ) ?? circle[0] ?? null;
  const personName = new Map(people.map((person) => [person.id, person.name]));

  const addQuickTime = () => {
    addQualityTime.mutate(30);
  };

  return (
    <Screen
      header={<PageHeader title="People" date={formatStamp()} rule={false} />}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={colors.bonds}
        />
      }
    >
      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data ? (
        <>
          {featured ? (
            <>
              <Panel style={{ gap: space.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
                  <RingMeter
                    value={inTouch}
                    max={Math.max(1, circle.length)}
                    size={100}
                    stroke={8}
                    color={colors.bonds}
                    center={`${inTouch}/${circle.length}`}
                    centerSize={22}
                    label="In touch"
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="footnote" tone="secondary">
                      {`Last spoke ${relativeDay(featured.lastContactAt).toLowerCase()}`}
                    </AppText>
                    <AppText
                      variant="title"
                      numberOfLines={1}
                      style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1.8 }}
                    >
                      {featured.name}
                    </AppText>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surfaceSunken,
                      borderRadius: radius.inner,
                      padding: space.md,
                      gap: 2,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <AppText
                        variant="title"
                        style={{ fontSize: 27, lineHeight: 31, letterSpacing: -1.3 }}
                      >
                        {formatNumber(recentMinutes)}
                      </AppText>
                      <AppText variant="footnote" tone="secondary">
                        min
                      </AppText>
                    </View>
                    <AppText variant="footnote" tone="secondary">
                      Time together
                    </AppText>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surfaceSunken,
                      borderRadius: radius.inner,
                      padding: space.md,
                      gap: 2,
                    }}
                  >
                    <AppText
                      variant="title"
                      tone="primary"
                      style={{ fontSize: 27, lineHeight: 31, letterSpacing: -1.3 }}
                    >
                      {averageMood ? averageMood.toFixed(1) : '—'}
                    </AppText>
                    <AppText variant="footnote" tone="secondary">
                      Avg feeling
                    </AppText>
                  </View>
                </View>

                <View style={{ gap: space.sm }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: space.md,
                    }}
                  >
                    <AppText variant="callout" style={{ fontWeight: '700' }}>
                      Quality time
                    </AppText>
                    <AppText
                      variant="callout"
                      style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}
                    >
                      {`${formatNumber(qualityDone)} / ${formatNumber(qualityTarget)} min`}
                    </AppText>
                  </View>
                  <Progress value={qualityPct} color={colors.bonds} height={6} />
                  <AppText variant="footnote" tone="tertiary">
                    {qualityLeft > 0
                      ? `${formatNumber(qualityLeft)} min to reach this week’s goal`
                      : 'This week’s goal is met.'}
                  </AppText>
                </View>
              </Panel>

              <View style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ flex: 1.35 }}>
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
            </>
          ) : null}

          {Platform.OS === 'android' ? (
            <>
              <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.inner,
                    backgroundColor: colors.surfaceSunken,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    name="phone"
                    size={20}
                    color={callSync.enabled ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <AppText variant="callout" style={{ fontFamily: fonts.bold }}>
                    Auto-log calls
                  </AppText>
                  <AppText variant="footnote" tone={callSync.error ? 'danger' : 'tertiary'}>
                    {callSync.syncing
                      ? 'Checking calls…'
                      : callSync.enabled
                        ? callSync.error
                          ? 'Call access is needed'
                          : callSync.lastSync
                            ? `On · checked ${new Date(callSync.lastSync).toLocaleTimeString(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}`
                            : 'On'
                        : 'Matches calls to people in your circle'}
                  </AppText>
                </View>
                <Switch
                  value={callSync.enabled}
                  onValueChange={(next) => {
                    void callSync.toggle(next);
                  }}
                  disabled={!callSync.ready}
                  accessibilityLabel="Auto-log phone calls"
                />
              </Panel>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Import phone calls"
                onPress={() => router.push('/call-import' as never)}
                style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
              >
                <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.inner,
                      backgroundColor: colors.surfaceSunken,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="phone" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="callout" style={{ fontFamily: fonts.bold }}>
                      Import phone calls
                    </AppText>
                    <AppText variant="footnote" tone="tertiary">
                      Review calls from this Android phone
                    </AppText>
                  </View>
                  <Icon name="chevron" size={18} color={colors.textTertiary} />
                </Panel>
              </Pressable>
            </>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginTop: space.sm,
            }}
          >
            <View style={{ gap: 2 }}>
              <AppText variant="title">Your circle</AppText>
              <AppText variant="footnote" tone="tertiary">
                Closest to due first
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a person"
              hitSlop={10}
              onPress={() => openAdd('person')}
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
            >
              <AppText variant="caption" tone="primary" style={{ letterSpacing: 0.8 }}>
                + ADD
              </AppText>
            </Pressable>
          </View>

          {people.length === 0 ? (
            <EmptyState
              icon="people"
              title="No people yet"
              message="Add the people who matter so contact quality can become visible."
              actionLabel="Add person"
              onAction={() => openAdd('person')}
            />
          ) : (
            <View>
              {circle.map((person, index) => (
                <View
                  key={person.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.md,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.separator,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${person.name}, ${person.remaining === null ? 'no contact yet' : `${Math.abs(person.remaining)} days ${person.remaining < 0 ? 'overdue' : 'left'}`}`}
                    onPress={() => router.push(`/person/${person.id}` as never)}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      opacity: pressed ? 0.62 : 1,
                    })}
                  >
                    <PersonAvatar
                      name={person.name}
                      days={person.days}
                      cadence={person.cadence}
                      color={person.tint}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="headline" numberOfLines={1}>
                        {person.name}
                      </AppText>
                      <AppText
                        variant="footnote"
                        style={{ color: person.tint, fontWeight: '600' }}
                        numberOfLines={1}
                      >
                        {person.days === null
                          ? `No contact yet · every ~${person.cadence} days`
                          : person.overdue
                            ? `${Math.abs(person.remaining ?? 0)} ${Math.abs(person.remaining ?? 0) === 1 ? 'day' : 'days'} over · every ~${person.cadence} days`
                            : `${person.remaining} ${person.remaining === 1 ? 'day' : 'days'} left · every ~${person.cadence} days`}
                      </AppText>
                    </View>
                  </Pressable>
                  <AppText
                    variant="footnote"
                    tone="secondary"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {relativeDay(person.lastContactAt)}
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Log contact with ${person.name}`}
                    onPress={() =>
                      router.push({
                        pathname: '/add/[form]',
                        params: { form: 'interaction', person: person.id },
                      })
                    }
                    style={({ pressed }) => ({
                      width: 42,
                      height: 42,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.55 : 1,
                    })}
                  >
                    <Icon name="plus" size={19} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginTop: space.sm,
            }}
          >
            <AppText variant="title">Recent contact</AppText>
            <AppText variant="footnote" tone="tertiary">
              Last 30 days
            </AppText>
          </View>

          {interactions.length === 0 ? (
            <EmptyState
              icon="message"
              title="No contact logged"
              message="Log calls, visits, texts, or video chats to see relationship momentum."
              actionLabel="Log contact"
              onAction={() => openAdd('interaction')}
            />
          ) : (
            <View>
              {interactions.slice(0, 6).map((interaction, index) => (
                <Pressable
                  key={interaction.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${personName.get(interaction.relationship_id) ?? 'Someone'}, ${channelLabel(interaction.channel)}, ${formatDate(interaction.occurred_at)}, ${interaction.duration_minutes ?? 0} minutes`}
                  onPress={() => openEdit('interaction', interaction.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.md,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.separator,
                    opacity: pressed ? 0.62 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radius.pill,
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={channelIcon(interaction.channel)} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="headline" numberOfLines={1}>
                      {personName.get(interaction.relationship_id) ?? 'Someone'}
                    </AppText>
                    <AppText variant="footnote" tone="tertiary">
                      {`${channelLabel(interaction.channel)} · ${formatDate(interaction.occurred_at)}`}
                    </AppText>
                  </View>
                  <AppText
                    variant="callout"
                    style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}
                  >
                    {`${formatNumber(Number(interaction.duration_minutes ?? 0))} min`}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}
