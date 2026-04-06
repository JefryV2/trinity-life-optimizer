/**
 * Rule-based spending grouping for review screens. Matches keywords in
 * category + note (e.g. "Starbucks" → Food & dining) without external APIs.
 */

export type ExpenseRowInput = {
  category: string | null | undefined;
  note: string | null | undefined;
  amount: number;
};

export type SmartGroupLine = {
  detail: string;
  amount: number;
};

export type SmartGroupBucket = {
  groupKey: string;
  label: string;
  emoji: string;
  /** Grouped by keyword rules vs. left as your budget/category label */
  autoGrouped: boolean;
  total: number;
  items: SmartGroupLine[];
};

const SMART_RULES: {
  key: string;
  label: string;
  emoji: string;
  patterns: string[];
}[] = [
  {
    key: 'food',
    label: 'Food & dining',
    emoji: '🍽️',
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
    emoji: '🚗',
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
    emoji: '🛍️',
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
    emoji: '🎬',
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
    emoji: '💊',
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
    emoji: '🏠',
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
    emoji: '📱',
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

function slugRawLabel(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 56);
  return s || 'unknown';
}

export function classifyExpense(
  category: string | null | undefined,
  note: string | null | undefined
): { groupKey: string; label: string; emoji: string; autoGrouped: boolean } {
  const blob = `${category || ''} ${note || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const rule of SMART_RULES) {
    if (rule.patterns.some((p) => blob.includes(p))) {
      return { groupKey: rule.key, label: rule.label, emoji: rule.emoji, autoGrouped: true };
    }
  }

  const raw =
    (category || '').trim() || (note || '').trim() || 'Uncategorized';
  return {
    groupKey: `raw:${slugRawLabel(raw)}`,
    label: raw,
    emoji: '📌',
    autoGrouped: false,
  };
}

export function buildSmartSpendingGroups(rows: ExpenseRowInput[]): SmartGroupBucket[] {
  const map = new Map<string, SmartGroupBucket>();

  for (const row of rows) {
    if (row.amount <= 0) continue;
    const { groupKey, label, emoji, autoGrouped } = classifyExpense(row.category, row.note);
    let bucket = map.get(groupKey);
    if (!bucket) {
      bucket = { groupKey, label, emoji, autoGrouped, total: 0, items: [] };
      map.set(groupKey, bucket);
    }
    bucket.total += row.amount;
    const c = (row.category || '').trim();
    const n = (row.note || '').trim();
    const detail =
      c && n && n !== c ? `${c} · ${n}` : n || c || 'Expense';
    bucket.items.push({ detail, amount: row.amount });
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
