/** Same keys the web app persists in profiles.data_preferences. */

export const FEATURE_FLAGS = [
  { key: 'enableHealthTracking', label: 'Health tracking', caption: 'Fitness, nutrition and sleep' },
  { key: 'enableWealthTracking', label: 'Wealth tracking', caption: 'Accounts and cash flow' },
  { key: 'enableRelationsTracking', label: 'Relations tracking', caption: 'People and contact quality' },
  { key: 'enableNotifications', label: 'Notifications', caption: 'Reminders and nudges' },
  { key: 'enableMentalHealth', label: 'Mental health', caption: 'Mood, stress and reflections' },
  { key: 'enableFitnessTracking', label: 'Fitness', caption: 'Workouts and steps' },
  { key: 'enableNutritionTracking', label: 'Nutrition', caption: 'Meals and macros' },
  { key: 'enableFinancialManagement', label: 'Budgets', caption: 'Spending limits per category' },
  { key: 'enableInvestmentTracking', label: 'Investments', caption: 'Positions and performance' },
  { key: 'enableRelationshipTracking', label: 'Contact log', caption: 'Conversations and visits' },
  { key: 'enableGratitudeJournal', label: 'Gratitude journal', caption: 'One good thing a day' },
  { key: 'enableGoalSetting', label: 'Goals', caption: 'Targets across the pillars' },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number]['key'];

export const defaultFeatureFlags = (): Record<FeatureFlagKey, boolean> =>
  Object.fromEntries(FEATURE_FLAGS.map((flag) => [flag.key, true])) as Record<
    FeatureFlagKey,
    boolean
  >;

export const readFeatureFlags = (
  preferences: Record<string, unknown> | null | undefined,
): Record<FeatureFlagKey, boolean> => {
  const defaults = defaultFeatureFlags();
  if (!preferences) return defaults;
  for (const flag of FEATURE_FLAGS) {
    if (typeof preferences[flag.key] === 'boolean') {
      defaults[flag.key] = preferences[flag.key] as boolean;
    }
  }
  return defaults;
};