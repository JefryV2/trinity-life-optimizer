import { supabase } from '@/integrations/supabase/client';

/**
 * The generated Supabase types predate `score_snapshots` and `experiments`.
 * Until `supabase gen types` is run again, this narrow escape hatch keeps the
 * new tables usable without sprinkling `as any` through the app.
 */
export const newTables = supabase as unknown as {
  from: (table: 'score_snapshots' | 'experiments') => any;
};
