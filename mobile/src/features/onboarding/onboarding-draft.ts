import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Json } from '@/lib/database.types';
import { calculateCalorieTarget } from '@/lib/health-utils';
import { supabase } from '@/lib/supabase';

export type OnboardingFocus = 'health' | 'wealth' | 'relations';

export interface OnboardingDraft {
  version: 1;
  firstName: string;
  age: number;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  focus: OnboardingFocus;
  goal: string;
  completedAt: string;
}

const DRAFT_KEY = 'auxo.onboarding.draft.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

/** The answers live on the phone until an account exists. */
export const readOnboardingDraft = async (): Promise<OnboardingDraft | null> => {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return null;

    const firstName = typeof parsed.firstName === 'string' ? parsed.firstName.trim() : '';
    const age = Number(parsed.age);
    const focus =
      parsed.focus === 'wealth' || parsed.focus === 'relations' ? parsed.focus : 'health';
    if (!firstName || !Number.isFinite(age) || age < 13) return null;

    const numberOrNull = (value: unknown) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? number : null;
    };

    return {
      version: 1,
      firstName,
      age,
      gender: typeof parsed.gender === 'string' ? parsed.gender : null,
      heightCm: numberOrNull(parsed.heightCm),
      weightKg: numberOrNull(parsed.weightKg),
      focus,
      goal: typeof parsed.goal === 'string' ? parsed.goal : '',
      completedAt:
        typeof parsed.completedAt === 'string' ? parsed.completedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveOnboardingDraft = async (draft: OnboardingDraft): Promise<void> => {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const clearOnboardingDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // Best effort.
  }
};

/** True when this account already has a completed onboarding on the server. */
export const profileCompletedOnboarding = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('data_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  const prefs = data?.data_preferences as Record<string, unknown> | null | undefined;
  return prefs?.onboarding_completed === true;
};

/**
 * Writes the local onboarding answers to the account. Called only after Nhost
 * has returned a session, so the user can finish onboarding before signing up.
 */
export const applyOnboardingDraft = async (
  userId: string,
  draft: OnboardingDraft,
): Promise<void> => {
  const firstName = draft.firstName.trim();
  if (!firstName) throw new Error('A first name is required.');

  const birthYear = new Date().getFullYear() - draft.age;
  const dailyCalories =
    draft.heightCm && draft.weightKg
      ? calculateCalorieTarget({
          gender: draft.gender,
          age: draft.age,
          heightCm: draft.heightCm,
          weightKg: draft.weightKg,
          activityLevel: 'moderate',
          goalType: 'maintain',
        })
      : null;

  const profile = await supabase
    .from('profiles')
    .select('id,data_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (profile.error) throw new Error(profile.error.message);

  const existingPrefs =
    (profile.data?.data_preferences as Record<string, unknown> | null | undefined) ?? {};
  const preferences: Record<string, unknown> = {
    ...existingPrefs,
    focus: draft.focus,
    onboarding_goal: draft.goal.trim() || `Get stronger in ${draft.focus}`,
    onboarding_completed: true,
    onboarded_at: new Date().toISOString(),
  };

  const profilePayload = {
    first_name: firstName,
    last_name: null,
    data_preferences: preferences as unknown as Json,
    updated_at: new Date().toISOString(),
  };

  if (profile.data?.id) {
    const { error } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', profile.data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('profiles')
      .insert({ ...profilePayload, user_id: userId });
    if (error) throw new Error(error.message);
  }

  const health = await supabase
    .from('user_profiles_health')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (health.error) throw new Error(health.error.message);

  const healthPayload = {
    birth_date: `${birthYear}-01-01`,
    gender: draft.gender,
    height_cm: draft.heightCm,
    weight_kg: draft.weightKg,
    target_weight_kg: null,
    activity_level: 'moderate',
    goal_type: 'maintain',
    daily_caloric_target: dailyCalories,
    updated_at: new Date().toISOString(),
  };

  if (health.data?.id) {
    const { error } = await supabase
      .from('user_profiles_health')
      .update(healthPayload)
      .eq('id', health.data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('user_profiles_health')
      .insert({ ...healthPayload, user_id: userId });
    if (error) throw new Error(error.message);
  }
};
