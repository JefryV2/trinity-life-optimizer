import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const decodeHeartRate = (base64: string | null): number | null => {
  if (!base64) return null;
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  if (bytes.length < 2) return null;
  const flags = bytes[0];
  return flags & 0x01 ? bytes[1] | (bytes[2] << 8) : bytes[1];
};

const requestAndroidBlePermissions = async () => {
  if (Platform.OS !== 'android') return true;
  const api = Number(Platform.Version);
  const permissions = api >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

export const useHeartRate = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const managerRef = useRef<BleManager | null>(null);
  const scanSubRef = useRef<Subscription | null>(null);
  const monitorSubRef = useRef<Subscription | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'connecting' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);

  const manager = () => {
    managerRef.current ??= new BleManager();
    return managerRef.current;
  };

  const saveReading = useMutation({
    mutationFn: async (value: number) => {
      if (!user) return;
      const { error } = await supabase.from('heart_rate_data').insert({
        user_id: user.id,
        heart_rate: value,
        timestamp: new Date().toISOString(),
        source_device: deviceRef.current?.name ?? 'BLE heart-rate monitor',
        activity_type: 'live',
        confidence: 0.95,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['heart'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const stop = useCallback(() => {
    scanSubRef.current?.remove();
    monitorSubRef.current?.remove();
    scanSubRef.current = null;
    monitorSubRef.current = null;
    const device = deviceRef.current;
    deviceRef.current = null;
    if (device) void device.cancelConnection().catch(() => undefined);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    stop();
    setMessage(null);
    const allowed = await requestAndroidBlePermissions();
    if (!allowed) {
      setStatus('error');
      setMessage('Bluetooth permission was denied. Manual BPM entry still works.');
      return;
    }

    const ble = manager();
    const state = await ble.state();
    if (state !== 'PoweredOn') {
      setStatus('error');
      setMessage('Bluetooth is not powered on. Turn it on or enter BPM manually.');
      return;
    }

    setStatus('scanning');
    ble.startDeviceScan(null, { allowDuplicates: false }, async (error, device) => {
      if (error) {
        setStatus('error');
        setMessage(error.message);
        stop();
        return;
      }
      if (!device?.name && !device?.serviceUUIDs?.includes('180d')) return;
      scanSubRef.current?.remove();
      ble.stopDeviceScan();
      setStatus('connecting');
      try {
        const connected = await device.connect();
        deviceRef.current = connected;
        await connected.discoverAllServicesAndCharacteristics();
        monitorSubRef.current = connected.monitorCharacteristicForService(
          '180d',
          '2a37',
          (monitorError, characteristic) => {
            if (monitorError) {
              setStatus('error');
              setMessage(monitorError.message);
              return;
            }
            const value = decodeHeartRate(characteristic?.value ?? null);
            if (value) {
              setBpm(value);
              saveReading.mutate(value);
            }
          },
        );
        setStatus('connected');
        setMessage(`Connected to ${connected.name ?? 'heart-rate monitor'}.`);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Could not connect to the heart-rate monitor.');
      }
    });
  }, [saveReading, stop]);

  useEffect(() => () => {
    stop();
    managerRef.current?.destroy();
    managerRef.current = null;
  }, [stop]);

  return { status, message, bpm, start, stop };
};