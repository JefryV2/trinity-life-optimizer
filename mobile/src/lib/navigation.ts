import { router } from 'expo-router';

export type HealthTab =
  | 'overview'
  | 'nutrition'
  | 'fitness'
  | 'sleep'
  | 'mental'
  | 'heart'
  | 'women';

export type WealthTab = 'overview' | 'investments' | 'expenses' | 'goals';

export const HEALTH_SECTIONS: Array<{ value: HealthTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'fitness', label: 'Activity' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'mental', label: 'Mental' },
  { value: 'heart', label: 'Heart' },
];

export const healthSections = (female: boolean) =>
  female
    ? [...HEALTH_SECTIONS, { value: 'women' as const, label: "Women's" }]
    : HEALTH_SECTIONS;

export const WEALTH_SECTIONS: Array<{ value: WealthTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'investments', label: 'Investing' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'goals', label: 'Budgets' },
];


export const openHealth = (tab: HealthTab = 'overview') =>
  router.push({ pathname: '/(tabs)/health', params: { tab } });

export const openWealth = (tab: WealthTab = 'overview') =>
  router.push({ pathname: '/(tabs)/wealth', params: { tab } });

export const openRelations = () => router.push('/(tabs)/relations');

/** Dashboard insight hrefs come from the scoring layer; map them onto real routes. */
export const openInsight = (href: string) => {
  switch (href) {
    case '/health/sleep':
      openHealth('sleep');
      break;
    case '/health/activity':
      openHealth('fitness');
      break;
    case '/wealth/accounts':
      openWealth('overview');
      break;
    case '/wealth/transactions':
      openWealth('expenses');
      break;
    case '/relations/people':
      openRelations();
      break;
    default:
      router.push('/(tabs)');
  }
};

export const openAdd = (form: string, params?: Record<string, string>) =>
  router.push({ pathname: '/add/[form]', params: { form, ...params } });

export const openEdit = (form: string, id: string) =>
  router.push({ pathname: '/add/[form]', params: { form, id } });