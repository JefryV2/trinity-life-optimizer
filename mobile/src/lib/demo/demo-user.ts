import type { Session, User } from '@supabase/supabase-js';

/** Stable id used for every demo row so the app has one coherent dataset. */
export const DEMO_USER_ID = '00000000-0000-4000-8000-00000000demo';
export const DEMO_EMAIL = 'demo@trinity.app';

export const createDemoUser = (): User => ({
  id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  phone: '',
  app_metadata: { provider: 'demo', providers: ['demo'] },
  user_metadata: {
    first_name: 'Alex',
    onboarding_completed: true,
    focus: 'health',
  },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  identities: [],
  factors: [],
});

export const createDemoSession = (): Session => ({
  access_token: 'demo-access-token',
  token_type: 'bearer',
  expires_in: 86_400,
  expires_at: Math.floor(Date.now() / 1000) + 86_400,
  refresh_token: 'demo-refresh-token',
  user: createDemoUser(),
});
