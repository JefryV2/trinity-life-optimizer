/**
 * Rule-based spending grouping, ported from the web app's
 * src/lib/spendingSmartGroups.ts. Matches keywords in category + note
 * (e.g. "Starbucks" → Food & dining) without external APIs.
 */

export interface ExpenseRowInput {
  category: string | null | undefined;
  note: string | null | undefined;
  amount: number;
}

export interface SmartGroupLine {
  detail: string;
  amount: number;
}

export interface SmartGroupBucket {
  groupKey: string;
  label: string;
  autoGrouped: boolean;
  total: number;
  items: SmartGroupLine[];
}

const SMART_RULES: Array<{ key: string; label: string; patterns: string[] }> = [
  {
    key: 'food',
    label: 'Food & dining',
    patterns: [
      'grocery',
      'groceries',
      'whole foods',
      'trader joe',
      'costco',
      'safeway',
      'kroger',
      'aldi',
      'lidl',
      'restaurant',
      'dining',
      'coffee',
      'cafe',
      'starbucks',
      'dunkin',
      'takeout',
      'doordash',
      'uber eats',
      'grubhub',
      'delivery',
      'burger',
      'pizza',
      'sushi',
      'lunch',
      'brunch',
      'bakery',
    ],
  },
  {
    key: 'transport',
    label: 'Transport & travel',
    patterns: [
      'uber',
      'lyft',
      'taxi',
      'gas',
      'fuel',
      'shell',
      'exxon',
      'chevron',
      'parking',
      'metro',
      'transit',
      'train',
      'flight',
      'airline',
      'hotel',
      'airbnb',
      'toll',
      'car wash',
    ],
  },
  {
    key: 'shopping',
    label: 'Shopping',
    patterns: [
      'amazon',
      'target',
      'walmart',
      'best buy',
      'apple store',
      'clothing',
      'mall',
      'retail',
      'ebay',
      'etsy',
    ],
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    patterns: [
      'netflix',
      'spotify',
      'hulu',
      'disney+',
      'movie',
      'cinema',
      'concert',
      'ticket',
      'game',
      'steam',
      'playstation',
      'xbox',
    ],
  },
  {
    key: 'health',
    label: 'Health & fitness',
    patterns: [
      'pharmacy',
      'cvs',
      'walgreens',
      'doctor',
      'dental',
      'medical',
      'hospital',
      'gym',
      'fitness',
      'peloton',
      'yoga',
    ],
  },
  {
    key: 'home',
    label: 'Home & utilities',
    patterns: [
      'rent',
      'mortgage',
      'electric',
      'water bill',
      'internet',
      'wifi',
      'utilities',
      'home depot',
      'lowes',
      'ikea',
      'furniture',
      'plumber',
    ],
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions & software',
    patterns: [
      'subscription',
      'icloud',
      'dropbox',
      'adobe',
      'microsoft 365',
      'github',
      'notion',
    ],
  },
];

const slugRawLabel = (raw: string): string => {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 56);
  return slug || 'unknown';
};

export const classifyExpense = (
  category: string | null | undefined,
  note: string | null | undefined,
): { groupKey: string; label: string; autoGrouped: boolean } => {
  const blob = `${category || ''} ${note || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const rule of SMART_RULES) {
    if (rule.patterns.some((pattern) => blob.includes(pattern))) {
      return { groupKey: rule.key, label: rule.label, autoGrouped: true };
    }
  }

  const raw = (category || '').trim() || (note || '').trim() || 'Uncategorized';
  return { groupKey: `raw:${slugRawLabel(raw)}`, label: raw, autoGrouped: false };
};

export const buildSmartSpendingGroups = (rows: ExpenseRowInput[]): SmartGroupBucket[] => {
  const map = new Map<string, SmartGroupBucket>();

  for (const row of rows) {
    if (row.amount <= 0) continue;
    const { groupKey, label, autoGrouped } = classifyExpense(row.category, row.note);
    let bucket = map.get(groupKey);
    if (!bucket) {
      bucket = { groupKey, label, autoGrouped, total: 0, items: [] };
      map.set(groupKey, bucket);
    }
    bucket.total += row.amount;
    const category = (row.category || '').trim();
    const note = (row.note || '').trim();
    const detail =
      category && note && note !== category ? `${category} · ${note}` : note || category || 'Expense';
    bucket.items.push({ detail, amount: row.amount });
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
};