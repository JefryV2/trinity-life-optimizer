import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'in';

export interface Settings {
  currency: string;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

const CURRENCY_KEY = 'auxo.settings.currency';
const WEIGHT_KEY = 'auxo.settings.weightUnit';
const HEIGHT_KEY = 'auxo.settings.heightUnit';

let state: Settings = { currency: 'USD', weightUnit: 'kg', heightUnit: 'cm' };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSettings = () => state;

export const useSettings = () =>
  useSyncExternalStore(subscribe, getSettings, getSettings);

const load = async () => {
  try {
    const [currency, weightUnit, heightUnit] = await Promise.all([
      AsyncStorage.getItem(CURRENCY_KEY),
      AsyncStorage.getItem(WEIGHT_KEY),
      AsyncStorage.getItem(HEIGHT_KEY),
    ]);
    state = {
      currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : state.currency,
      weightUnit: weightUnit === 'lb' ? 'lb' : state.weightUnit,
      heightUnit: heightUnit === 'in' ? 'in' : state.heightUnit,
    };
    emit();
  } catch {
    // Defaults are fine.
  }
};

void load();

export const setCurrency = async (value: string) => {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return;
  state = { ...state, currency };
  emit();
  await AsyncStorage.setItem(CURRENCY_KEY, currency);
};

export const setWeightUnit = async (value: WeightUnit) => {
  state = { ...state, weightUnit: value };
  emit();
  await AsyncStorage.setItem(WEIGHT_KEY, value);
};

export const setHeightUnit = async (value: HeightUnit) => {
  state = { ...state, heightUnit: value };
  emit();
  await AsyncStorage.setItem(HEIGHT_KEY, value);
};

export const kgToDisplay = (kg: number, unit: WeightUnit): number =>
  unit === 'lb' ? Math.round(kg * 2.2046226218 * 10) / 10 : kg;

export const displayToKg = (value: number, unit: WeightUnit): number =>
  unit === 'lb' ? value / 2.2046226218 : value;

export const cmToDisplay = (cm: number, unit: HeightUnit): number =>
  unit === 'in' ? Math.round(cm / 2.54) : cm;

export const displayToCm = (value: number, unit: HeightUnit): number =>
  unit === 'in' ? value * 2.54 : value;
