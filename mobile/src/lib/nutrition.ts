/**
 * Daily vitamin and mineral needs, and the totals accumulated from food.
 *
 * Values are the standard adult Recommended Dietary Allowances. The profile's
 * sex and age choose the right column; pregnancy/lactation is not tracked yet.
 */
export type NutrientKey =
  | 'vitaminA'
  | 'vitaminC'
  | 'vitaminD'
  | 'vitaminE'
  | 'vitaminK'
  | 'vitaminB1'
  | 'vitaminB2'
  | 'vitaminB6'
  | 'vitaminB12'
  | 'folate'
  | 'calcium'
  | 'iron'
  | 'magnesium'
  | 'potassium'
  | 'zinc';

export type Micronutrients = Partial<Record<NutrientKey, number>>;
export type NutrientUnit = 'mg' | 'µg';

export interface NeedProfile {
  gender?: string | null;
  birth_date?: string | null;
}

interface NeedContext {
  sex: 'female' | 'male';
  age: number;
  ageGroup: string;
}

interface NutrientSpec {
  key: NutrientKey;
  label: string;
  unit: NutrientUnit;
  group: 'vitamin' | 'mineral';
  /** Shown in the Today panel; the rest are still stored. */
  featured: boolean;
  target: (context: NeedContext) => number;
}

const ageFrom = (birthDate: string | null | undefined): number => {
  if (!birthDate) return 30;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 30;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.max(19, Math.min(100, age));
};

const ageGroup = (age: number): string => {
  if (age <= 30) return '19–30';
  if (age <= 50) return '31–50';
  if (age <= 70) return '51–70';
  return '71+';
};

const bySex = (male: number, female: number) => (context: NeedContext) =>
  context.sex === 'female' ? female : male;

export const NUTRIENTS: NutrientSpec[] = [
  {
    key: 'vitaminA',
    label: 'Vitamin A',
    unit: 'µg',
    group: 'vitamin',
    featured: true,
    target: bySex(900, 700),
  },
  {
    key: 'vitaminC',
    label: 'Vitamin C',
    unit: 'mg',
    group: 'vitamin',
    featured: true,
    target: bySex(90, 75),
  },
  {
    key: 'vitaminD',
    label: 'Vitamin D',
    unit: 'µg',
    group: 'vitamin',
    featured: true,
    target: ({ age }) => (age >= 71 ? 20 : 15),
  },
  {
    key: 'vitaminE',
    label: 'Vitamin E',
    unit: 'mg',
    group: 'vitamin',
    featured: true,
    target: () => 15,
  },
  {
    key: 'vitaminK',
    label: 'Vitamin K',
    unit: 'µg',
    group: 'vitamin',
    featured: true,
    target: bySex(120, 90),
  },
  {
    key: 'vitaminB6',
    label: 'Vitamin B6',
    unit: 'mg',
    group: 'vitamin',
    featured: true,
    target: ({ sex, age }) => (age >= 51 ? (sex === 'female' ? 1.5 : 1.7) : 1.3),
  },
  {
    key: 'vitaminB12',
    label: 'Vitamin B12',
    unit: 'µg',
    group: 'vitamin',
    featured: true,
    target: () => 2.4,
  },
  {
    key: 'folate',
    label: 'Folate',
    unit: 'µg',
    group: 'vitamin',
    featured: true,
    target: () => 400,
  },
  {
    key: 'calcium',
    label: 'Calcium',
    unit: 'mg',
    group: 'mineral',
    featured: true,
    target: ({ sex, age }) =>
      age >= 71 || (sex === 'female' && age >= 51) ? 1200 : 1000,
  },
  {
    key: 'iron',
    label: 'Iron',
    unit: 'mg',
    group: 'mineral',
    featured: true,
    target: ({ sex, age }) => (sex === 'female' && age < 51 ? 18 : 8),
  },
  {
    key: 'magnesium',
    label: 'Magnesium',
    unit: 'mg',
    group: 'mineral',
    featured: true,
    target: ({ sex, age }) =>
      age < 31 ? (sex === 'female' ? 310 : 400) : sex === 'female' ? 320 : 420,
  },
  // Tracked in the database, not on the compact panel.
  {
    key: 'vitaminB1',
    label: 'Vitamin B1',
    unit: 'mg',
    group: 'vitamin',
    featured: false,
    target: bySex(1.2, 1.1),
  },
  {
    key: 'vitaminB2',
    label: 'Vitamin B2',
    unit: 'mg',
    group: 'vitamin',
    featured: false,
    target: bySex(1.3, 1.1),
  },
  {
    key: 'potassium',
    label: 'Potassium',
    unit: 'mg',
    group: 'mineral',
    featured: false,
    target: bySex(3400, 2600),
  },
  {
    key: 'zinc',
    label: 'Zinc',
    unit: 'mg',
    group: 'mineral',
    featured: false,
    target: bySex(11, 8),
  },
];

const KNOWN_KEYS = new Set<string>(NUTRIENTS.map((nutrient) => nutrient.key));

export const dailyNeeds = (profile?: NeedProfile | null) => {
  const age = ageFrom(profile?.birth_date);
  const sex: NeedContext['sex'] = profile?.gender === 'female' ? 'female' : 'male';
  const context: NeedContext = { sex, age, ageGroup: ageGroup(age) };
  const knownSex = profile?.gender === 'female' || profile?.gender === 'male';
  const label = knownSex
    ? `Daily needs · ${sex === 'female' ? 'women' : 'men'}${profile?.birth_date ? ` ${context.ageGroup}` : ''}`
    : 'Daily needs · adult';

  return {
    context,
    label,
    items: NUTRIENTS.map((nutrient) => ({
      ...nutrient,
      target: nutrient.target(context),
    })),
  };
};

const parseMicros = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

export const sumMicronutrients = (
  entries: Array<{ micronutrients?: unknown }>,
): Micronutrients => {
  const totals: Micronutrients = {};
  for (const entry of entries) {
    const micros = parseMicros(entry.micronutrients);
    if (!micros) continue;
    for (const [key, value] of Object.entries(micros)) {
      if (!KNOWN_KEYS.has(key) || typeof value !== 'number' || !Number.isFinite(value)) continue;
      const nutrient = key as NutrientKey;
      totals[nutrient] = (totals[nutrient] ?? 0) + value;
    }
  }
  return totals;
};

export const formatNutrientValue = (value: number): string => {
  if (value >= 10) return String(Math.round(value));
  if (value >= 1) return String(Math.round(value * 10) / 10);
  return String(Math.round(value * 100) / 100);
};

export const hasMicronutrientData = (entries: Array<{ micronutrients?: unknown }>) =>
  entries.some((entry) => {
    const micros = parseMicros(entry.micronutrients);
    return Boolean(micros && Object.keys(micros).length > 0);
  });
