import { getNhost } from '@/lib/nhost';
import schemaMap from '@/lib/schema-map.json';

/**
 * A small PostgREST-shaped bridge over Nhost's GraphQL API.
 *
 * The app was written against `supabase.from(...)`, using only a narrow subset:
 * select (explicit columns), insert, update, delete, upsert, eq/gte/lte,
 * order, limit and maybeSingle. Rather than rewriting every hook and screen,
 * this maps those calls to Hasura queries and keeps the `{ data, error }`
 * result shape the app already checks.
 */
type Row = Record<string, unknown>;

export interface DbError {
  message: string;
}

export interface DbResult<T> {
  data: T;
  error: DbError | null;
}

type FilterOp = '_eq' | '_gte' | '_lte';

const COLUMNS = schemaMap as Record<string, Record<string, string>>;
// Hasura serialises numeric columns as strings to preserve precision.
const NUMERIC = new Set([
  'integer',
  'bigint',
  'smallint',
  'numeric',
  'double precision',
  'real',
  'money',
]);

const columnsOf = (table: string): Record<string, string> => COLUMNS[table] ?? {};
const allFields = (table: string): string => Object.keys(columnsOf(table)).join(' ');

const normalizeRow = (table: string, row: Row): Row => {
  const types = columnsOf(table);
  const out: Row = { ...row };
  for (const [column, type] of Object.entries(types)) {
    const value = out[column];
    if (NUMERIC.has(type) && typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) out[column] = parsed;
    }
  }
  return out;
};

class Query implements PromiseLike<DbResult<Row | Row[] | null>> {
  private readonly table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selection: string | null = null;
  private payload: Row | Row[] | null = null;
  private filters: { column: string; op: FilterOp; value: unknown }[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private max: number | null = null;
  private mode: 'maybe' | 'one' | null = null;
  private conflict: { onConflict?: string } | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*') {
    this.action = 'select';
    this.selection = columns;
    return this;
  }

  insert(values: Row | Row[]) {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(values: Row) {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(values: Row | Row[], options?: { onConflict?: string }) {
    this.action = 'insert';
    this.payload = values;
    this.conflict = options ?? {};
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: '_eq', value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: '_gte', value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, op: '_lte', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.max = count;
    return this;
  }

  maybeSingle() {
    this.mode = 'maybe';
    this.max = 1;
    return this;
  }

  single() {
    this.mode = 'one';
    this.max = 1;
    return this;
  }

  private where() {
    const where: Record<string, Record<string, unknown>> = {};
    for (const filter of this.filters) {
      where[filter.column] = { ...(where[filter.column] ?? {}), [filter.op]: filter.value };
    }
    return where;
  }

  private fields() {
    if (!this.selection || this.selection === '*') return allFields(this.table);
    return this.selection
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
  }

  private async run(): Promise<DbResult<Row | Row[] | null>> {
    const nhost = getNhost();
    let query = '';
    const variables: Record<string, unknown> = {};
    let key = this.table;

    if (this.action === 'select') {
      const args: string[] = [];
      const defs: string[] = [];
      if (this.filters.length) {
        defs.push(`$where: ${this.table}_bool_exp!`);
        args.push('where: $where');
        variables.where = this.where();
      }
      if (this.orders.length) {
        defs.push(`$order_by: [${this.table}_order_by!]`);
        args.push('order_by: $order_by');
        variables.order_by = this.orders.map((order) => ({
          [order.column]: order.ascending ? 'asc' : 'desc',
        }));
      }
      if (this.max != null) {
        defs.push('$limit: Int');
        args.push('limit: $limit');
        variables.limit = this.max;
      }
      const signature = defs.length ? `(${defs.join(', ')})` : '';
      const call = args.length ? `(${args.join(', ')})` : '';
      query = `query${signature} { ${this.table}${call} { ${this.fields()} } }`;
    } else if (this.action === 'insert') {
      const objects = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      variables.objects = objects;
      let call = 'objects: $objects';
      if (this.conflict) {
        const conflictColumns = (this.conflict.onConflict ?? 'id')
          .split(',')
          .map((column) => column.trim())
          .filter(Boolean);
        const constraint =
          conflictColumns.length === 1 && conflictColumns[0] === 'id'
            ? `${this.table}_pkey`
            : `${this.table}_${conflictColumns.join('_')}_key`;
        const updateColumns = Array.from(new Set(objects.flatMap((object) => Object.keys(object))))
          .filter(
            (column) =>
              !conflictColumns.includes(column) && column !== 'id' && column !== 'created_at',
          );
        call += `, on_conflict: { constraint: ${constraint}, update_columns: [${updateColumns.join(
          ', ',
        )}] }`;
      }
      query = `mutation($objects: [${this.table}_insert_input!]!) { insert_${this.table}(${call}) { returning { ${this.fields()} } } }`;
      key = `insert_${this.table}`;
    } else if (this.action === 'update') {
      variables.where = this.where();
      variables.set = this.payload ?? {};
      query = `mutation($where: ${this.table}_bool_exp!, $set: ${this.table}_set_input!) { update_${this.table}(where: $where, _set: $set) { returning { ${this.fields()} } } }`;
      key = `update_${this.table}`;
    } else {
      variables.where = this.where();
      query = `mutation($where: ${this.table}_bool_exp!) { delete_${this.table}(where: $where) { returning { ${this.fields()} } } }`;
      key = `delete_${this.table}`;
    }

    try {
      const response = await nhost.graphql.request({ query, variables });
      const body = response.body;
      if (body.errors?.length) {
        return { data: null, error: { message: body.errors.map((e) => e.message).join('; ') } };
      }

      const result = (body.data as Record<string, unknown> | undefined)?.[key];
      if (this.action === 'select') {
        const rows = ((result ?? []) as Row[]).map((row) => normalizeRow(this.table, row));
        if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null };
        if (this.mode === 'one') {
          if (rows.length !== 1) return { data: null, error: { message: 'Expected one row.' } };
          return { data: rows[0], error: null };
        }
        return { data: rows, error: null };
      }

      const mutation = result as { returning?: Row[] } | undefined;
      const rows = (mutation?.returning ?? []).map((row) => normalizeRow(this.table, row));
      if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null };
      if (this.mode === 'one') {
        if (rows.length !== 1) return { data: null, error: { message: 'Expected one row.' } };
        return { data: rows[0], error: null };
      }
      return { data: rows, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'GraphQL request failed.' },
      };
    }
  }

  then<TResult1 = DbResult<Row | Row[] | null>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<Row | Row[] | null>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export const nhostDb = {
  from: (table: string) => new Query(table),
};
