import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';
import { demoClient } from '@/lib/demo/demo-client';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { nhostDb } from '@/lib/nhost-db';

/**
 * Compatibility facade.
 *
 * The app was written against Supabase's query builder. `from` now resolves to
 * Nhost GraphQL (via nhost-db) or the offline demo client, so the 219 existing
 * data calls keep working without rewriting every hook.
 *
 * Auth lives in `providers/auth-provider.tsx` and uses the Nhost SDK directly.
 */
export const supabase = {
  from: (table: string) => (isDemoMode() ? demoClient.from(table) : nhostDb.from(table)),
  functions: {
    invoke: async () => ({
      data: null,
      error: { message: 'Server functions are not used on the Nhost backend.' },
    }),
  },
} as unknown as SupabaseClient<Database>;
