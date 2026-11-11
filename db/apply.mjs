// Builds and validates the schema for both supported Postgres targets.
//
//   npm run db:build      -> writes db/schema.sql + db/nhost.sql, validates both
//   npm run db:validate   -> validates without writing
//
// db/schema.sql  : plain Postgres (Neon, Railway, RDS). Includes an auth shim.
// db/nhost.sql   : Nhost. Uses Nhost's auth.users, creates auth.uid() (Nhost
//                  does not ship one), and adapts the signup trigger to
//                  Nhost's `metadata` column.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('..', import.meta.url));
const migrationsDir = join(root, 'supabase', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const migrations = files.map((name) => ({
  name,
  sql: readFileSync(join(migrationsDir, name), 'utf8'),
}));

const plainAuthShim = readFileSync(join(root, 'db', '00-auth-shim.sql'), 'utf8');
const nhostPrelude = readFileSync(join(root, 'db', 'nhost-prelude.sql'), 'utf8');

// Nhost's SQL role cannot write the auth schema. So the Nhost bundle:
//   - rewrites auth.uid() to public.app_uid()
//   - drops the FK to auth.users
//   - drops the signup trigger (Nhost owns auth.users; the app creates the profile)
const adaptForNhost = (sql) => {
  let out = sql.replace(/auth\.uid\(\)/g, 'public.app_uid()');
  out = out.replace(
    /\s+REFERENCES\s+auth\.users\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/gi,
    '',
  );
  out = out.replace(
    /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;\s*/g,
    '',
  );
  out = out.replace(
    /CREATE TRIGGER on_auth_user_created[\s\S]*?EXECUTE FUNCTION public\.handle_new_user\(\);\s*/g,
    '',
  );
  return out;
};

const targets = [
  {
    label: 'plain Postgres',
    out: 'db/schema.sql',
    header: [
      '-- Trinity schema for plain Postgres (Neon, Railway, RDS).',
      '-- Apply with: psql "$DATABASE_URL" -f db/schema.sql',
      '-- Includes a minimal auth shim so RLS works without Supabase/Nhost.',
    ],
    validateShim: plainAuthShim,
    includeShimInOutput: true,
    steps: [
      { name: '00-auth-shim.sql', sql: plainAuthShim },
      ...migrations,
    ],
  },
  {
    label: 'Nhost',
    out: 'db/nhost.sql',
    header: [
      '-- Trinity schema for Nhost.',
      '-- Paste into Nhost -> Hasura Console -> Data -> SQL.',
      '-- Touches only the public schema: Nhost owns auth.users and the SQL role',
      '-- cannot write the auth schema. Profile rows are created by the app.',
    ],
    validateShim: 'select 1;',
    includeShimInOutput: false,
    steps: [
      { name: 'nhost-prelude.sql', sql: nhostPrelude },
      ...migrations.map((migration) => ({
        name: migration.name,
        sql: adaptForNhost(migration.sql),
      })),
    ],
  },
];

const write = !process.argv.includes('--no-write');
let failed = 0;

for (const target of targets) {
  const body = target.steps.map((step) => step.sql.trim()).join('\n\n');
  const bundle = `${target.header.join('\n')}\n\n${body}\n`;

  if (write) {
    writeFileSync(join(root, target.out), bundle);
    console.log(`${target.label}: wrote ${target.out} (${(bundle.length / 1024).toFixed(1)} kB)`);
  }

  const db = new PGlite();
  let targetFailed = 0;
  try {
    await db.exec(target.validateShim);
    for (const step of target.steps) {
      if (step.name === '00-auth-shim.sql') continue;
      try {
        await db.exec(step.sql);
      } catch (error) {
        targetFailed += 1;
        console.error(`  FAIL ${step.name}\n       ${error.message}`);
      }
    }

    const count = async (sql) => (await db.query(sql)).rows[0].n;
    const tables = await count(
      `select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
    );
    const policies = await count(`select count(*)::int as n from pg_policies`);
    console.log(
      `  ${target.label}: ${tables} tables · ${policies} RLS policies · ${
        targetFailed === 0 ? 'ok' : `${targetFailed} failed`
      }`,
    );
  } catch (error) {
    targetFailed += 1;
    console.error(`  ${target.label}: ${error.message}`);
  } finally {
    await db.close();
  }
  failed += targetFailed;
}

if (failed > 0) {
  console.error(`\n${failed} failure(s).`);
  process.exitCode = 1;
} else {
  console.log('\nBoth targets apply cleanly.');
}
