import { readAsStringAsync } from 'expo-file-system/legacy';

import type { Micronutrients } from '@/lib/nutrition';

/**
 * A plate is estimated by a vision service, then every item is shown as an
 * editable portion. The app never treats the estimate as a final log.
 *
 * Production should point EXPO_PUBLIC_MEAL_VISION_ENDPOINT at a server that
 * owns the provider key and accepts multipart field `image`. For local
 * development only, EXPO_PUBLIC_OPENAI_API_KEY can call OpenAI directly.
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

const endpoint = process.env.EXPO_PUBLIC_MEAL_VISION_ENDPOINT?.trim();
const openAiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
const model = process.env.EXPO_PUBLIC_MEAL_VISION_MODEL?.trim() || 'gpt-4o-mini';

export const mealVisionConfigured = Boolean(endpoint || openAiKey);

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

  // The endpoint may return the estimate for the detected portion instead of
  // per 100 g. Normalise it so the portion stepper always scales correctly.
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

const timeout = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

const analyseWithEndpoint = async (uri: string) => {
  if (!endpoint) return null;
  const request = timeout(45_000);
  try {
    const form = new FormData();
    form.append('image', {
      uri,
      name: 'meal.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    form.append('locale', 'en');

    const response = await fetch(endpoint, {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/json' },
      signal: request.signal,
    });
    if (!response.ok) {
      throw new Error(`Photo service returned ${response.status}.`);
    }
    return parseItems(await response.json());
  } finally {
    request.done();
  }
};

const PROMPT = `You are estimating a meal from one photo. Return ONLY valid JSON, no markdown.
Schema:
{"items":[{"name":"grilled chicken breast","grams":150,"calories":248,"protein":46,"carbs":0,"fat":5,"fiber":0,"sugar":0,"sodium":320,"confidence":0.86}]}
Rules:
- List each visible edible component separately, including oils, sauces, sides and drinks.
- grams is the estimated edible portion, not the plate weight.
- calories and macros are for that estimated portion; use common food composition values.
- confidence is 0 to 1. Be conservative when the image is ambiguous or there is no size reference.
- Do not invent packaging, brands, or ingredients that are not visible.
- Keep names short and generic (e.g. "white rice", "fried egg").
- If the plate cannot be identified, return {"items":[]}.
`;

const analyseWithOpenAi = async (uri: string) => {
  if (!openAiKey) return null;
  const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
  const request = timeout(45_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' },
              },
            ],
          },
        ],
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Photo recognition failed (${response.status}).${detail ? ` ${detail.slice(0, 120)}` : ''}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('Photo recognition returned no result.');
    const clean = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '');
    return parseItems(JSON.parse(clean));
  } finally {
    request.done();
  }
};

export const analyseMealPhoto = async (uri: string): Promise<MealVisionItem[]> => {
  if (!mealVisionConfigured) {
    throw new Error(
      'Photo recognition is not connected yet. Add what you see below, or connect a vision service.',
    );
  }

  const result = (await analyseWithEndpoint(uri)) ?? (await analyseWithOpenAi(uri));
  if (!result) throw new Error('Photo recognition returned no result.');
  return result;
};
