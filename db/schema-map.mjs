// Writes mobile/src/lib/schema-map.json from the Nhost schema.
// The GraphQL adapter uses it to expand select('*') and to coerce numeric
// columns, which Hasura returns as strings to preserve precision.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('..', import.meta.url));
const db = new PGlite();
await db.exec(readFileSync(join(root, 'db', 'nhost.sql'), 'utf8'));

const rows = (
  await db.query(
    `select table_name, column_name, data_type
     from information_schema.columns
     where table_schema = 'public'
     order by table_name, ordinal_position`,
  )
).rows;

const map = {};
for (const row of rows) {
  if (!map[row.table_name]) map[row.table_name] = {};
  map[row.table_name][row.column_name] = row.data_type;
}

writeFileSync(
  join(root, 'mobile', 'src', 'lib', 'schema-map.json'),
  `${JSON.stringify(map, null, 2)}\n`,
);
console.log(`wrote schema map: ${Object.keys(map).length} tables, ${rows.length} columns`);
await db.close();
