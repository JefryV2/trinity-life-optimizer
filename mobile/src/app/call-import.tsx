import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { useRelations } from '@/features/relations/use-relations';
import { formatDate, formatNumber } from '@/lib/format';
import { openAdd } from '@/lib/navigation';
import { fonts, radius, space, useTheme } from '@/theme';
import { getRecentCalls, type DeviceCall } from '../../modules/call-log';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'blocked';
type CallFilter = 'all' | 'incoming' | 'outgoing' | 'missed';

const FILTERS: Array<{ value: CallFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
  { value: 'missed', label: 'Missed' },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const typeLabel = (type: DeviceCall['type']) => {
  if (type === 'incoming') return 'Incoming';
  if (type === 'outgoing') return 'Outgoing';
  if (type === 'missed') return 'Missed';
  if (type === 'voicemail') return 'Voicemail';
  if (type === 'rejected') return 'Rejected';
  if (type === 'blocked') return 'Blocked';
  return 'Call';
};

const isAnswered = (call: DeviceCall) =>
  call.type === 'incoming' || call.type === 'outgoing' || call.type === 'other';

const durationLabel = (seconds: number) => {
  if (seconds <= 0) return '—';
  return `${Math.max(1, Math.round(seconds / 60))} min`;
};

const timeLabel = (value: number) =>
  new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const BackHeader = () => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={10}
        style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="back" size={24} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText
          style={{ fontSize: 28, lineHeight: 34, fontFamily: fonts.black, letterSpacing: -1 }}
        >
          Phone calls
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          Android call log · last 30 days
        </AppText>
      </View>
    </View>
  );
};

export default function CallImportScreen() {
  const { colors } = useTheme();
  const { data, importCalls } = useRelations();
  const people = data?.relationships ?? [];
  const interactions = data?.interactions ?? [];

  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [calls, setCalls] = useState<DeviceCall[]>([]);
  const [filter, setFilter] = useState<CallFilter>('all');
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<DeviceCall | null>(null);

  const byName = useMemo(
    () => new Map(people.map((person) => [normalize(person.name), person.id])),
    [people],
  );

  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecentCalls(30, 250);
      setCalls(result);
    } catch (caught) {
      const code = (caught as { code?: string })?.code;
      if (code === 'ERR_CALL_LOG_PERMISSION') {
        setPermission('denied');
      } else {
        setError(caught instanceof Error ? caught.message : 'Could not read the call log.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    void PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG)
      .then((granted) => {
        if (cancelled || !granted) return;
        setPermission('granted');
        void loadCalls();
      })
      .catch(() => {
        if (!cancelled) setPermission('unknown');
      });
    return () => {
      cancelled = true;
    };
  }, [loadCalls]);

  useEffect(() => {
    if (calls.length === 0) return;
    const nextAssignments: Record<string, string | null> = {};
    const nextSelected = new Set<string>();
    for (const call of calls) {
      const match = byName.get(normalize(call.name ?? '')) ?? null;
      nextAssignments[call.id] = match;
      if (!match || !isAnswered(call)) continue;
      const alreadyLogged = interactions.some(
        (entry) =>
          entry.relationship_id === match &&
          entry.channel === 'call' &&
          Math.abs(new Date(entry.occurred_at).getTime() - call.date) < 120_000,
      );
      if (!alreadyLogged) nextSelected.add(call.id);
    }
    setAssignments(nextAssignments);
    setSelected(nextSelected);
  }, [byName, calls, interactions]);

  const requestAccess = async () => {
    setError(null);
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        setPermission('granted');
        await loadCalls();
        return;
      }
      setPermission(
        result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not request call access.');
    }
  };

  const filteredCalls = useMemo(
    () => calls.filter((call) => filter === 'all' || call.type === filter),
    [calls, filter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, DeviceCall[]>();
    for (const call of filteredCalls) {
      const key = new Date(call.date).toDateString();
      const list = map.get(key) ?? [];
      list.push(call);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filteredCalls]);

  const selectedCalls = useMemo(
    () => calls.filter((call) => selected.has(call.id) && assignments[call.id]),
    [assignments, calls, selected],
  );

  const alreadyLogged = (call: DeviceCall) => {
    const personId = assignments[call.id];
    if (!personId) return false;
    return interactions.some(
      (entry) =>
        entry.relationship_id === personId &&
        entry.channel === 'call' &&
        Math.abs(new Date(entry.occurred_at).getTime() - call.date) < 120_000,
    );
  };

  const toggle = (call: DeviceCall) => {
    if (!assignments[call.id] || alreadyLogged(call)) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(call.id)) next.delete(call.id);
      else next.add(call.id);
      return next;
    });
  };

  const assignPerson = (personId: string | null) => {
    if (!assigning) return;
    const call = assigning;
    setAssignments((current) => ({ ...current, [call.id]: personId }));
    setSelected((current) => {
      const next = new Set(current);
      if (personId && isAnswered(call)) next.add(call.id);
      else next.delete(call.id);
      return next;
    });
    setAssigning(null);
  };

  const save = async () => {
    if (selectedCalls.length === 0) return;
    setError(null);
    try {
      await importCalls.mutateAsync(
        selectedCalls.map((call) => ({
          relationshipId: assignments[call.id]!,
          durationMinutes: Math.max(1, Math.round(call.durationSeconds / 60)),
          occurredAt: new Date(call.date).toISOString(),
          missed: call.type === 'missed',
        })),
      );
      toast.show(
        `${selectedCalls.length} call${selectedCalls.length === 1 ? '' : 's'} imported`,
      );
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/relations');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not import these calls.');
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.lg, gap: space.lg }}>
        <BackHeader />
        <AppText variant="callout" tone="secondary">
          Call log import is only available on Android.
        </AppText>
      </Screen>
    );
  }

  const renderPermission = () => {
    const blocked = permission === 'blocked';
    const denied = permission === 'denied';
    return (
      <Panel style={{ gap: space.lg, alignItems: 'center', paddingVertical: space.xxl }}>
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="phone" size={28} color={colors.primary} />
        </View>
        <View style={{ gap: space.xs, alignItems: 'center' }}>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {blocked ? 'Call access is blocked' : 'Read your recent calls?'}
          </AppText>
          <AppText
            variant="callout"
            tone="secondary"
            style={{ textAlign: 'center', maxWidth: 330 }}
          >
            {blocked
              ? 'Open Android settings and allow Call logs for Auxo, then come back.'
              : 'Auxo reads the last 30 days from this phone so you can choose what to log. Nothing is saved until you tap Import.'}
          </AppText>
        </View>
        <Button
          label={blocked ? 'Open settings' : denied ? 'Try again' : 'Allow call access'}
          onPress={() => {
            if (blocked) void Linking.openSettings();
            else void requestAccess();
          }}
        />
        <AppText variant="footnote" tone="tertiary" style={{ textAlign: 'center' }}>
          Call access can be revoked at any time in Android settings.
        </AppText>
      </Panel>
    );
  };

  return (
    <Screen
      refreshControl={
        permission === 'granted' ? (
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              void loadCalls();
            }}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      contentContainerStyle={{
        paddingTop: space.lg,
        paddingBottom: space.xxl,
        gap: space.lg,
        flexGrow: 1,
      }}
    >
      <BackHeader />

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      {permission !== 'granted' ? renderPermission() : null}

      {permission === 'granted' ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <AppText variant="headline">Recent calls</AppText>
            <AppText variant="footnote" tone="tertiary">
              {loading ? 'Reading…' : `${formatNumber(calls.length)} found`}
            </AppText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, flexShrink: 0, maxHeight: 42 }}
            contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}
          >
            {FILTERS.map((option) => {
              const active = filter === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(option.value)}
                  style={({ pressed }) => ({
                    minHeight: 42,
                    borderRadius: radius.pill,
                    paddingHorizontal: space.lg,
                    backgroundColor: active ? colors.primary : colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <AppText
                    tone={active ? 'onPrimary' : 'secondary'}
                    style={{ fontFamily: active ? fonts.bold : fonts.medium }}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {!loading && calls.length === 0 ? (
            <Panel style={{ gap: space.md, paddingVertical: space.xxl }}>
              <AppText variant="headline">No calls found</AppText>
              <AppText variant="footnote" tone="secondary">
                Calls from the last 30 days will appear here.
              </AppText>
            </Panel>
          ) : null}

          {groups.map(([day, dayCalls]) => (
            <View key={day} style={{ gap: space.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <AppText variant="caption" tone="secondary">
                  {formatDate(new Date(dayCalls[0].date))}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  {dayCalls.length}
                </AppText>
              </View>
              <Panel padded={false}>
                {dayCalls.map((call, index) => {
                  const personId = assignments[call.id] ?? null;
                  const person = people.find((entry) => entry.id === personId);
                  const isSelected = selected.has(call.id);
                  const logged = alreadyLogged(call);
                  return (
                    <View
                      key={call.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.md,
                        paddingHorizontal: space.lg,
                        paddingVertical: space.md,
                        borderBottomWidth: index === dayCalls.length - 1 ? 0 : 1,
                        borderBottomColor: colors.separator,
                      }}
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected, disabled: !personId || logged }}
                        accessibilityLabel={`Select call with ${person?.name ?? call.name ?? call.number}`}
                        onPress={() => toggle(call)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: radius.pill,
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: personId && !logged ? 1 : 0.4,
                        }}
                      >
                        {isSelected ? (
                          <Icon name="check" size={15} color={colors.onPrimary} />
                        ) : null}
                      </Pressable>

                      <View style={{ flex: 1, gap: 1 }}>
                        <AppText
                          variant="callout"
                          style={{ fontFamily: fonts.bold }}
                          numberOfLines={1}
                        >
                          {call.name?.trim() || call.number || 'Unknown'}
                        </AppText>
                        <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
                          {[
                            typeLabel(call.type),
                            timeLabel(call.date),
                            durationLabel(call.durationSeconds),
                            logged ? 'Logged' : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </AppText>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          person ? `Change person, currently ${person.name}` : 'Choose a person'
                        }
                        onPress={() => setAssigning(call)}
                        style={({ pressed }) => ({
                          maxWidth: 128,
                          borderRadius: radius.pill,
                          backgroundColor: person ? colors.surfaceSunken : colors.primarySoft,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          opacity: pressed ? 0.65 : 1,
                        })}
                      >
                        <AppText
                          variant="footnote"
                          tone={person ? 'secondary' : 'primary'}
                          numberOfLines={1}
                          style={{ flexShrink: 1, fontFamily: fonts.semibold }}
                        >
                          {person?.name ?? 'Who?'}
                        </AppText>
                        <Icon
                          name="chevron"
                          size={13}
                          color={person ? colors.textTertiary : colors.primary}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </Panel>
            </View>
          ))}

          {people.length === 0 ? (
            <Panel style={{ gap: space.md }}>
              <AppText variant="headline">Add someone first</AppText>
              <AppText variant="footnote" tone="secondary">
                Calls can only be linked to people already in your circle.
              </AppText>
              <Button
                label="Add a person"
                variant="secondary"
                onPress={() => openAdd('person')}
              />
            </Panel>
          ) : null}

          <View style={{ marginTop: 'auto', gap: space.sm, paddingTop: space.lg }}>
            <Button
              label={
                selectedCalls.length > 0
                  ? `Import ${selectedCalls.length} call${selectedCalls.length === 1 ? '' : 's'}`
                  : 'Select calls to import'
              }
              onPress={() => void save()}
              loading={importCalls.isPending}
              disabled={selectedCalls.length === 0}
            />
            <AppText variant="footnote" tone="tertiary" style={{ textAlign: 'center' }}>
              Only selected calls are saved. Logged and missed calls are skipped by default.
            </AppText>
          </View>
        </>
      ) : null}

      <Sheet
        compact
        visible={Boolean(assigning)}
        title="Who was this?"
        subtitle={assigning ? assigning.name?.trim() || assigning.number : undefined}
        onClose={() => setAssigning(null)}
      >
        <View>
          {people.map((person, index) => {
            const active = assigning ? assignments[assigning.id] === person.id : false;
            return (
              <Pressable
                key={person.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => assignPerson(person.id)}
                style={{
                  minHeight: 54,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  borderBottomWidth: index === people.length - 1 ? 0 : 1,
                  borderBottomColor: colors.separator,
                }}
              >
                <AppText variant="callout" style={{ flex: 1 }}>
                  {person.name}
                </AppText>
                {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => assignPerson(null)}
            style={{ minHeight: 54, justifyContent: 'center' }}
          >
            <AppText variant="callout" tone="tertiary">
              Not in my circle
            </AppText>
          </Pressable>
        </View>
      </Sheet>
    </Screen>
  );
}
