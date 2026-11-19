import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import { toast } from '@/components/ui/toast';
import { useRelations } from '@/features/relations/use-relations';
import { getRecentCalls, type DeviceCall } from '../../../modules/call-log';

const ENABLED_KEY = 'auxo.calls.auto-log';
const LAST_SYNC_KEY = 'auxo.calls.last-sync';
const INITIAL_WINDOW_MS = 7 * 86_400_000;
const MATCH_WINDOW_MS = 120_000;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const isAnswered = (call: DeviceCall) =>
  call.type === 'incoming' || call.type === 'outgoing' || call.type === 'other';

type CallSyncState = {
  enabled: boolean;
  ready: boolean;
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
  toggle: (next: boolean) => Promise<void>;
};

const CallSyncContext = createContext<CallSyncState | null>(null);

export const useCallSync = () => {
  const value = useContext(CallSyncContext);
  if (!value) throw new Error('useCallSync must be used inside CallSyncProvider');
  return value;
};

export const CallSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const { data, importCalls } = useRelations();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabledRef = useRef(false);
  const dataRef = useRef(data);
  const importCallsRef = useRef(importCalls);
  const syncingRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    importCallsRef.current = importCalls;
  }, [importCalls]);

  const runSync = useCallback(async () => {
    if (!enabledRef.current || Platform.OS !== 'android' || syncingRef.current) return;
    const people = dataRef.current?.relationships ?? [];
    if (people.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);
    setError(null);
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      );
      if (!granted) {
        setError('Call access is needed for automatic logging.');
        return;
      }

      const stored = Number(await AsyncStorage.getItem(LAST_SYNC_KEY));
      const since = Number.isFinite(stored) && stored > 0 ? stored : Date.now() - INITIAL_WINDOW_MS;
      const calls = await getRecentCalls(30, 250);
      const byName = new Map(
        people.map((person) => [normalize(person.name), person.id]),
      );
      const interactions = dataRef.current?.interactions ?? [];
      const candidates: Array<{
        relationshipId: string;
        durationMinutes: number;
        occurredAt: string;
      }> = [];

      for (const call of calls) {
        if (call.date <= since || !isAnswered(call)) continue;
        const relationshipId = byName.get(normalize(call.name ?? ''));
        if (!relationshipId) continue;
        const occurredAt = new Date(call.date).toISOString();
        const alreadyLogged = interactions.some(
          (entry) =>
            entry.relationship_id === relationshipId &&
            entry.channel === 'call' &&
            Math.abs(new Date(entry.occurred_at).getTime() - call.date) < MATCH_WINDOW_MS,
        );
        const duplicate = candidates.some(
          (entry) =>
            entry.relationshipId === relationshipId &&
            Math.abs(new Date(entry.occurredAt).getTime() - call.date) < MATCH_WINDOW_MS,
        );
        if (alreadyLogged || duplicate) continue;
        candidates.push({
          relationshipId,
          durationMinutes: Math.max(1, Math.round(call.durationSeconds / 60)),
          occurredAt,
        });
      }

      if (candidates.length > 0) {
        await importCallsRef.current.mutateAsync(candidates);
        toast.show(
          `${candidates.length} call${candidates.length === 1 ? '' : 's'} added to People`,
        );
      }

      const next = Date.now();
      await AsyncStorage.setItem(LAST_SYNC_KEY, String(next));
      setLastSync(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sync calls.');
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedEnabled, storedLast] = await Promise.all([
        AsyncStorage.getItem(ENABLED_KEY),
        AsyncStorage.getItem(LAST_SYNC_KEY),
      ]);
      if (cancelled) return;
      const isEnabled = storedEnabled === '1';
      enabledRef.current = isEnabled;
      setEnabled(isEnabled);
      setLastSync(Number(storedLast) || null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const peopleCount = data?.relationships.length ?? 0;
  useEffect(() => {
    if (!ready || !enabled || peopleCount === 0) return;
    void runSync();
  }, [enabled, peopleCount, ready, runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && enabledRef.current) void runSync();
    });
    return () => subscription.remove();
  }, [runSync]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (Platform.OS !== 'android') return;
      setError(null);
      if (!next) {
        enabledRef.current = false;
        setEnabled(false);
        setError(null);
        await AsyncStorage.setItem(ENABLED_KEY, '0');
        return;
      }

      try {
        let granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        );
        if (!granted) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          );
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
        }
        if (!granted) {
          toast.show('Allow Call logs for Auxo to auto-log calls.');
          return;
        }

        const existing = await AsyncStorage.getItem(LAST_SYNC_KEY);
        if (!existing) {
          await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now() - INITIAL_WINDOW_MS));
        }
        enabledRef.current = true;
        setEnabled(true);
        await AsyncStorage.setItem(ENABLED_KEY, '1');
        await runSync();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not enable call sync.');
      }
    },
    [runSync],
  );

  const value = useMemo(
    () => ({ enabled, ready, syncing, lastSync, error, toggle }),
    [enabled, error, lastSync, ready, syncing, toggle],
  );

  return <CallSyncContext.Provider value={value}>{children}</CallSyncContext.Provider>;
};
