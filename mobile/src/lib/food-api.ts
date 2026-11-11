/**
 * Food search with no API key.
 *
 * Open Food Facts is free, open and covers packaged foods worldwide:
 *   - a barcode resolves in one request (fast, exact);
 *   - a text query uses their search index, then hydrates the top matches from
 *     the product API (the index does not store nutrition).
 *
 * Everything is normalised to "per 100 g" so it matches the app's food-entry
 * model (and the demo catalogue). Results are cached briefly to stay well under
 * OFF's rate limits.
 */
export interface FoodResult {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  barcode?: string;
}

const SEARCH_BASE = 'https://search.openfoodfacts.org/search';
const PRODUCT_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'nutriments',
  'serving_size',
].join(',');
const USER_AGENT = 'Trinity/1.0 (health tracker; +https://trinity.app)';
const MAX_RESULTS = 8;
const CONCURRENCY = 4;
const CACHE_TTL_MS = 10 * 60 * 1000;

const productCache = new Map<string, { at: number; value: FoodResult | null }>();
const queryCache = new Map<string, { at: number; value: FoodResult[] }>();

const fresh = (at: number) => Date.now() - at < CACHE_TTL_MS;

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const fromProduct = (product: Record<string, unknown> | null | undefined): FoodResult | null => {
  if (!product) return null;
  const name = String(
    product.product_name || product.product_name_en || product.generic_name || '',
  ).trim();
  if (!name) return null;

  const nutrients = (product.nutriments ?? {}) as Record<string, unknown>;
  // kcal is usually given directly; some products only carry kilojoules.
  const calories =
    toNumber(nutrients['energy-kcal_100g']) ||
    toNumber(nutrients['energy-kcal']) ||
    toNumber(nutrients.energy_100g) / 4.184;
  if (!calories) return null;

  const brand = String(product.brands ?? '').split(',')[0]?.trim() || undefined;
  const servingSize = String(product.serving_size ?? '').trim();

  return {
    name,
    brand,
    calories: Math.round(calories),
    protein: round1(toNumber(nutrients.proteins_100g)),
    carbs: round1(toNumber(nutrients.carbohydrates_100g)),
    fat: round1(toNumber(nutrients.fat_100g)),
    serving: servingSize ? `per 100 g · serving ${servingSize}` : 'per 100 g',
    barcode: product.code ? String(product.code) : undefined,
  };
};

const fetchJson = async (url: string): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Open Food Facts returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> => {
  const output: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return output;
};

const dedupe = (items: FoodResult[]): FoodResult[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name.toLowerCase()}|${item.brand?.toLowerCase() ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getFoodByBarcode = async (rawCode: string): Promise<FoodResult | null> => {
  const code = rawCode.replace(/\D/g, '');
  if (code.length < 8 || code.length > 14) return null;

  const cached = productCache.get(code);
  if (cached && fresh(cached.at)) return cached.value;

  const data = (await fetchJson(`${PRODUCT_BASE}/${code}.json?fields=${FIELDS}`)) as {
    product?: Record<string, unknown>;
  };
  const value = fromProduct(data.product);
  productCache.set(code, { at: Date.now(), value });
  return value;
};

/** Text search: find candidate codes, then hydrate their nutrition. */
const searchOpenFoodFacts = async (query: string): Promise<FoodResult[]> => {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(query)}&page_size=${MAX_RESULTS * 2}`;
  const data = (await fetchJson(url)) as {
    hits?: Array<{ code?: string }>;
  };
  const codes = (data.hits ?? [])
    .map((hit) => (hit.code ? String(hit.code) : ''))
    .filter((code) => code.length >= 8 && code.length <= 14)
    .slice(0, MAX_RESULTS);

  const products = await mapLimit(codes, CONCURRENCY, async (code) => {
    try {
      return await getFoodByBarcode(code);
    } catch {
      return null;
    }
  });

  return dedupe(products.filter((item): item is FoodResult => Boolean(item)));
};

export const searchFoods = async (rawQuery: string): Promise<FoodResult[]> => {
  const query = rawQuery.trim();
  if (!query) return [];

  if (/^\d{8,14}$/.test(query)) {
    const hit = await getFoodByBarcode(query);
    return hit ? [hit] : [];
  }

  const cached = queryCache.get(query.toLowerCase());
  if (cached && fresh(cached.at)) return cached.value;

  const results = await searchOpenFoodFacts(query);
  queryCache.set(query.toLowerCase(), { at: Date.now(), value: results });
  return results;
};
