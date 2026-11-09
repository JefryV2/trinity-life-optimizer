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

export const openAdd = (form: string) =>
  router.push({ pathname: '/add/[form]', params: { form } });