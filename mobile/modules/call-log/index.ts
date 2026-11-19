import { requireOptionalNativeModule } from 'expo-modules-core';

export type DeviceCallType =
  | 'incoming'
  | 'outgoing'
  | 'missed'
  | 'voicemail'
  | 'rejected'
  | 'blocked'
  | 'other';

export type DeviceCall = {
  id: string;
  number: string;
  name: string | null;
  type: DeviceCallType;
  date: number;
  durationSeconds: number;
};

type NativeCallLog = {
  getRecentCalls: (sinceDays: number, limit: number) => Promise<DeviceCall[]>;
};

const Native = requireOptionalNativeModule<NativeCallLog>('AuxoCallLog');

export const callLogAvailable = Boolean(Native);

/** Read-only access to the Android call log. Never writes to it. */
export const getRecentCalls = (sinceDays = 30, limit = 250): Promise<DeviceCall[]> => {
  if (!Native) {
    return Promise.reject(new Error('Call log import is not available in this build.'));
  }
  return Native.getRecentCalls(sinceDays, limit);
};
