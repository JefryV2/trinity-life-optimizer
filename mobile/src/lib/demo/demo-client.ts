import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

import { buildDemoDatabase } from './demo-seed';
import { isDemoMode } from './demo-mode';
import { createDemoSession } from './demo-user';

type Row = Record<string, unknown>;
type DemoDatabase = Record<string, Row[]>;

const DB_KEY = 'trinity.demo.db.v1';

let database: DemoDatabase | null = null;

const compare = (left: unknown, right: unknown): number => {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
};

const createId = (table: string): string =>
  `${table}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const persist = async (): Promise<void> => {
  if (!database) return;
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(database));
  } catch {
    // Demo data is disposable; a failed write only means it resets next boot.
  }
};

const ensureLoaded = async (): Promise<DemoDatabase> => {
  if (database) return database;
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    if (raw) database = JSON.parse(raw) as DemoDatabase;
  } catch {
    database = null;
  }
  database ??= buildDemoDatabase();
  return database;
};

export const resetDemoDatabase = async (): Promise<void> => {
  database = buildDemoDatabase();
  await persist();
};

type QueryResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

/**
 * A tiny subset of the PostgREST query builder: select, filters, ordering,
 * limits, maybeSingle, insert, update, delete and upsert. That is everything
 * the app's hooks use.
 */
class DemoQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private max: number | null = null;
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Row | Row[] | null = null;
  private conflictColumns = 'id';
  private singleMode: 'maybe' | 'required' | null = null;

  constructor(private readonly table: string) {}

  select(_columns?: string): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push((row) => compare(row[column], value) >= 0 && row[column] != null);
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push((row) => compare(row[column], value) <= 0 && row[column] != null);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): this {
    this.max = count;
    return this;
  }

  maybeSingle(): this {
    this.singleMode = 'maybe';
    return this;
  }

  single(): this {
    this.singleMode = 'required';
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.mode = 'update';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.mode = 'delete';
    return this;
  }

  upsert(payload: Row | Row[], options?: { onConflict?: string }): this {
    this.mode = 'upsert';
    this.payload = payload;
    this.conflictColumns = options?.onConflict ?? 'id';
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => filter(row));
  }

  private async run(): Promise<QueryResult> {
    const db = await ensureLoaded();
    const rows = (db[this.table] ??= []);
    const now = new Date().toISOString();

    if (this.mode === 'insert' || this.mode === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const written: Row[] = [];

      for (const item of items) {
        if (this.mode === 'upsert') {
          const columns = this.conflictColumns.split(',').map((column) => column.trim());
          const existing = rows.find((row) => columns.every((column) => row[column] === item[column]));
          if (existing) {
            Object.assign(existing, item, { updated_at: now });
            written.push(existing);
            continue;
          }
        }
        const created: Row = {
          id: createId(this.table),
          created_at: now,
          ...item,
        };
        rows.push(created);
        written.push(created);
      }

      await persist();
      return { data: written, error: null };
    }

    if (this.mode === 'update') {
      const updated = rows.filter((row) => this.matches(row));
      for (const row of updated) Object.assign(row, this.payload ?? {});
      await persist();
      return { data: updated, error: null };
    }

    if (this.mode === 'delete') {
      db[this.table] = rows.filter((row) => !this.matches(row));
      await persist();
      return { data: null, error: null };
    }

    let result = rows.filter((row) => this.matches(row));
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result = [...result].sort((a, b) => (ascending ? 1 : -1) * compare(a[column], b[column]));
    }
    if (this.max !== null) result = result.slice(0, this.max);

    if (this.singleMode) {
      return { data: result[0] ?? null, error: null };
    }

    return { data: result.map((row) => ({ ...row })), error: null };
  }
}

let session: Session = createDemoSession();

const listeners = new Set<(session: Session | null) => void>();

export const getDemoSession = (): Session => session;

export const updateDemoUser = (metadata: Record<string, unknown>): User => {
  session = {
    ...session,
    user: {
      ...session.user,
      user_metadata: { ...session.user.user_metadata, ...metadata },
      updated_at: new Date().toISOString(),
    },
  };
  listeners.forEach((listener) => listener(session));
  return session.user;
};

export const demoClient = {
  from: (table: string) => new DemoQuery(table),
  auth: {
    getSession: async () => ({ data: { session: isDemoMode() ? session : null }, error: null }),
    onAuthStateChange: (callback: (event: string, next: Session | null) => void) => {
      const listener = (next: Session | null) => callback('USER_UPDATED', next);
      listeners.add(listener);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(listener);
            },
          },
        },
      };
    },
    signInWithPassword: async () => ({ data: { session, user: session.user }, error: null }),
    signUp: async () => ({ data: { session, user: session.user }, error: null }),
    signOut: async () => ({ error: null }),
    updateUser: async ({ data }: { data?: Record<string, unknown> }) => {
      const user = updateDemoUser(data ?? {});
      return { data: { user }, error: null };
    },
    startAutoRefresh: async () => undefined,
    stopAutoRefresh: async () => undefined,
  },
  functions: {
    invoke: async () => ({ data: { foods: [] }, error: null }),
  },
};
