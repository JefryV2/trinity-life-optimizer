// Generates a Hasura metadata payload that tracks every table and gives the
// `user` role owner-only access.
//
//   npm run db:hasura
//
// Then apply it with your Nhost admin secret (Settings -> API):
//
//   curl -X POST "https://<subdomain>.hasura.<region>.nhost.run/v1/metadata" \
//     -H "x-hasura-admin-secret: <ADMIN_SECRET>" \
//     -H "content-type: application/json" \
//     -d @db/hasura-metadata.json
//
// Never put the admin secret in the app.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('..', import.meta.url));
const db = new PGlite();
await db.exec(readFileSync(join(root, 'db', 'nhost.sql'), 'utf8'));

const tables = (
  await db.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  )
).rows.map((row) => row.table_name);

const columns = (
  await db.query(
    `select table_name, column_name from information_schema.columns
     where table_schema = 'public' order by table_name, ordinal_position`,
  )
).rows;

const byTable = new Map();
for (const row of columns) {
  if (!byTable.has(row.table_name)) byTable.set(row.table_name, []);
  byTable.get(row.table_name).push(row.column_name);
}

const table = (name) => ({ schema: 'public', name });
const ownerFilter = { user_id: { _eq: 'X-Hasura-User-Id' } };
// Ownership columns are never client-writable on update.
const locked = new Set(['id', 'user_id', 'created_at']);

const args = [];
const drops = [];
const secured = [];
const skipped = [];

for (const name of tables) {
  args.push({ type: 'pg_track_table', args: { source: 'default', table: table(name) } });

  const cols = byTable.get(name) ?? [];
  if (!cols.includes('user_id')) {
    skipped.push(name);
    continue;
  }

  const writable = cols.filter((column) => !locked.has(column));
  const base = { source: 'default', table: table(name), role: 'user' };

  drops.push(
    { type: 'pg_drop_select_permission', args: base },
    { type: 'pg_drop_insert_permission', args: base },
    { type: 'pg_drop_update_permission', args: base },
    { type: 'pg_drop_delete_permission', args: base },
  );

  args.push({
    type: 'pg_create_select_permission',
    args: { ...base, permission: { columns: '*', filter: ownerFilter } },
  });
  args.push({
    type: 'pg_create_insert_permission',
    args: {
      ...base,
      permission: {
        // No `set`: Hasura removes the column from the insert input when set is
        // used, and the app sends user_id. `check` still blocks spoofing.
        columns: '*',
        check: ownerFilter,
      },
    },
  });
  args.push({
    type: 'pg_create_update_permission',
    args: {
      ...base,
      permission: { columns: writable, filter: ownerFilter, check: ownerFilter },
    },
  });
  args.push({
    type: 'pg_create_delete_permission',
    args: { ...base, permission: { filter: ownerFilter } },
  });
  secured.push(name);
}

writeFileSync(
  join(root, 'db', 'hasura-metadata.json'),
  `${JSON.stringify({ type: 'bulk_keep_going', args }, null, 2)}\n`,
);

writeFileSync(
  join(root, 'db', 'hasura-permissions-reset.json'),
  `${JSON.stringify({ type: 'bulk_keep_going', args: drops }, null, 2)}\n`,
);

console.log(`tracked ${tables.length} tables`);
console.log(`owner-only permissions on ${secured.length}: ${secured.join(', ')}`);
if (skipped.length) console.log(`no user_id (tracked only): ${skipped.join(', ')}`);
console.log('wrote db/hasura-metadata.json');

await db.close();
