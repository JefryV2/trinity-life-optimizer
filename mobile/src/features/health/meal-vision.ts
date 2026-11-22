import { readAsStringAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { getNhost, getStoredSession } from '@/lib/nhost';
import type { Micronutrients } from '@/lib/nutrition';

/**
 * A plate is estimated by the Auxo meal-vision function, then every item is
 * shown as an editable portion. The app never holds the provider key and never
 * treats the estimate as a final log.
 */

export interface MealVisionItem {
  id: string;
  name: string;
  grams: number;
  confidence?: number;
  per100: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    micros?: Micronutrients;
  };
}

export interface MealVisionUsage {
  remainingToday: number;
  remainingMonth: number;
  usedToday: number;
  usedMonth: number;
}

export type MealVisionErrorCode =
  | 'auth'
  | 'limit'
  | 'config'
  | 'provider'
  | 'network';

export class MealVisionError extends Error {
  readonly code: MealVisionErrorCode;
  readonly usage?: MealVisionUsage;

  constructor(message: string, code: MealVisionErrorCode, usage?: MealVisionUsage) {
    super(message);
    this.name = 'MealVisionError';
    this.code = code;
    this.usage = usage;
  }
}

export interface MealVisionResult {
  items: MealVisionItem[];
  usage?: MealVisionUsage;
}

const endpoint = process.env.EXPO_PUBLIC_MEAL_VISION_ENDPOINT?.trim();

export const mealVisionConfigured = Boolean(endpoint);

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const normaliseMicros = (
  value: unknown,
  portionFactor = 1,
): Micronutrients | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const output: Micronutrients = {};
  for (const [key, raw] of Object.entries(source)) {
    const number = asNumber(raw);
    if (number !== null && number >= 0) {
      output[key as keyof Micronutrients] = round(number * portionFactor, 2);
    }
  }
  return Object.keys(output).length ? output : undefined;
};

const fromRaw = (raw: unknown, index: number): MealVisionItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!name) return null;

  const grams = clamp(
    asNumber(item.grams) ?? asNumber(item.weight_grams) ?? asNumber(item.weight) ?? 100,
    1,
    3000,
  );

  const base = (item.per100 && typeof item.per100 === 'object'
    ? item.per100
    : item) as Record<string, unknown>;

  let calories = asNumber(base.calories) ?? asNumber(base.kcal) ?? 0;
  let protein = asNumber(base.protein) ?? asNumber(base.protein_g) ?? 0;
  let carbs = asNumber(base.carbs) ?? asNumber(base.carbs_g) ?? 0;
  let fat = asNumber(base.fat) ?? asNumber(base.fat_g) ?? 0;

  // The function returns the estimate for the detected portion. Normalise it
  // so the portion stepper always scales correctly.
  if (!item.per100) {
    const factor = 100 / grams;
    calories *= factor;
    protein *= factor;
    carbs *= factor;
    fat *= factor;
  }

  const portionFactor = item.per100 ? 1 : 100 / grams;
  const per100 = {
    calories: round(clamp(calories, 0, 2000), 0),
    protein: round(clamp(protein, 0, 200), 1),
    carbs: round(clamp(carbs, 0, 300), 1),
    fat: round(clamp(fat, 0, 200), 1),
    fiber: round(clamp((asNumber(base.fiber) ?? 0) * portionFactor, 0, 100), 1),
    sugar: round(clamp((asNumber(base.sugar) ?? 0) * portionFactor, 0, 200), 1),
    sodium: Math.round(clamp((asNumber(base.sodium) ?? 0) * portionFactor, 0, 20000)),
    micros: normaliseMicros(base.micros, portionFactor),
  };

  if (per100.calories <= 0) return null;

  const confidence = asNumber(item.confidence);
  return {
    id: `vision-${Date.now()}-${index}`,
    name,
    grams: Math.round(grams),
    confidence:
      confidence === null ? undefined : clamp(confidence > 1 ? confidence / 100 : confidence, 0, 1),
    per100,
  };
};

const parseItems = (payload: unknown): MealVisionItem[] => {
  const source =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)
        ? (payload as { items: unknown[] }).items
        : [];
  return source
    .map((item, index) => fromRaw(item, index))
    .filter((item): item is MealVisionItem => item !== null);
};

const normaliseUsage = (value: unknown): MealVisionUsage | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const number = (key: string) => {
    const parsed = asNumber(source[key]);
    return parsed === null ? 0 : Math.max(0, Math.round(parsed));
  };
  return {
    remainingToday: number('remainingToday'),
    remainingMonth: number('remainingMonth'),
    usedToday: number('usedToday'),
    usedMonth: number('usedMonth'),
  };
};

const accessToken = (): string | null => {
  try {
    return getNhost().sessionStorage.get()?.accessToken ?? getStoredSession()?.accessToken ?? null;
  } catch {
    return getStoredSession()?.accessToken ?? null;
  }
};

const timeout = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

const errorForResponse = async (response: Response): Promise<MealVisionError> => {
  const payload = (await response.json().catch(() => null)) as
    | { message?: unknown; code?: unknown; usage?: unknown }
    | null;
  const usage = normaliseUsage(payload?.usage);
  const message = typeof payload?.message === 'string' ? payload.message : '';

  if (response.status === 401) {
    return new MealVisionError('Sign in again to read a meal photo.', 'auth', usage);
  }
  if (response.status === 429) {
    return new MealVisionError(
      message || 'You have used this photo read allowance. Add ingredients manually.',
      'limit',
      usage,
    );
  }
  if (response.status === 413) {
    return new MealVisionError(
      'That photo is too large. Try again or add ingredients manually.',
      'provider',
      usage,
    );
  }
  return new MealVisionError(
    message || 'I could not read that photo. Add what you see below.',
    'provider',
    usage,
  );
};

export const analyseMealPhoto = async (uri: string): Promise<MealVisionResult> => {
  if (!endpoint) {
    throw new MealVisionError(
      'Photo reading is not connected yet. Add what you see below.',
      'config',
    );
  }

  const token = accessToken();
  if (!token) {
    throw new MealVisionError('Sign in again to read a meal photo.', 'auth');
  }

  // Phone cameras produce 12–48 MP files. A plate only needs a long edge of
  // about 1280 px, and the server deliberately caps the upload size.
  let prepared = uri;
  try {
    const resized = await manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.72, format: SaveFormat.JPEG },
    );
    prepared = resized.uri;
  } catch {
    // Keep the original; the size check below still gives a clear message.
  }

  const base64 = await readAsStringAsync(prepared, { encoding: 'base64' });
  if (!base64) {
    throw new MealVisionError('I could not read that photo. Add what you see below.', 'provider');
  }
  if (Math.ceil((base64.length * 3) / 4) > 3_200_000) {
    throw new MealVisionError(
      'That photo is too large. Try again or add ingredients manually.',
      'provider',
    );
  }

  const request = timeout(30_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
      signal: request.signal,
    });

    if (!response.ok) throw await errorForResponse(response);

    const payload = (await response.json()) as { items?: unknown };
    return {
      items: parseItems(payload),
      usage: normaliseUsage((payload as { usage?: unknown }).usage),
    };
  } catch (error) {
    if (error instanceof MealVisionError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new MealVisionError(
        'Reading took too long. Add what you see below, or try again.',
        'network',
      );
    }
    throw new MealVisionError('I could not read that photo. Add what you see below.', 'network');
  } finally {
    request.done();
  }
};
