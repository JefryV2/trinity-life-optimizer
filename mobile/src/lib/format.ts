/** Date, number and copy helpers shared by every screen. */

export const isoDate = (date: Date = new Date()): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const startOfDay = (date: Date = new Date()): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const startOfMonth = (date: Date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

export const endOfMonth = (date: Date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

export const formatMoney = (value: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);

export const formatCompactMoney = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return formatMoney(value);
};

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-US').format(Math.round(value));

export const formatDate = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const formatLongDate = (value: string | Date = new Date()): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

/** Compact date stamp for the ruled header, like "Mon 9 Nov". */
export const formatStamp = (value: Date = new Date()): string =>
  value.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export const relativeDay = (value: string | null): string => {
  if (!value) return 'No contact yet';
  const then = new Date(value).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(value);
};

export const daysBetween = (a: string | Date, b: string | Date = new Date()): number => {
  const first = typeof a === 'string' ? new Date(a) : a;
  const second = typeof b === 'string' ? new Date(b) : b;
  return Math.floor((second.getTime() - first.getTime()) / 86_400_000);
};

export const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

export const scoreLabel = (score: number): string => {
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Steady';
  if (score > 0) return 'Needs attention';
  return 'Not enough data';
};

export const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const initials = (first?: string | null, last?: string | null): string => {
  const letters = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  return letters || 'T';
};
