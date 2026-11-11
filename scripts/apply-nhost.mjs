// Applies db/nhost.sql and db/hasura-metadata.json to the Nhost project.
//
//   NHOST_ADMIN_SECRET=... npm run nhost:apply
//   npm run nhost:apply -- --skip-schema      (only metadata/permissions)
//   npm run nhost:apply -- --force-schema     (re-run the SQL even if tables exist)
//
// The secret can also live in db/.nhost-admin (gitignored).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const subdomain = process.env.NHOST_SUBDOMAIN ?? 'rgbqzglhvswpuwotofrr';
const region = process.env.NHOST_REGION ?? 'eu-central-1';
const base = `https://${subdomain}.hasura.${region}.nhost.run/v1`;

const secretFile = join(root, 'db', '.nhost-admin');
const secret =
  process.env.NHOST_ADMIN_SECRET ??
  (existsSync(secretFile) ? readFileSync(secretFile, 'utf8').trim() : '');

if (!secret) {
  console.error(
    'Missing admin secret.\n' +
      'Set NHOST_ADMIN_SECRET, or write it to db/.nhost-admin (gitignored).\n' +
      'Find it in Nhost -> Settings -> API -> Admin Secret.',
  );
  process.exit(1);
}

const post = async (path, body) => {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': secret },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (!response.ok) {
    const detail =
      parsed && typeof parsed === 'object' ? JSON.stringify(parsed.error ?? parsed) : parsed;
    throw new Error(`${path} failed (${response.status}): ${detail}`);
  }
  return parsed;
};

// The metadata gateway times out on large payloads, so send 15 operations at a
// time and retry transient failures.
const applyOps = async (payload, label) => {
  const args = payload.args ?? [];
  for (let index = 0; index < args.length; index += 15) {
    const chunk = { type: payload.type ?? 'bulk_keep_going', args: args.slice(index, index + 15) };
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await post('/metadata', chunk);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
    if (lastError) throw lastError;
    process.stdout.write(`  ${label} ${index}-${index + chunk.args.length - 1}\n`);
  }
};

const forceSchema = process.argv.includes('--force-schema');
let skipSchema = process.argv.includes('--skip-schema');

if (!skipSchema && !forceSchema) {
  const check = await post('/query', {
    type: 'run_sql',
    args: {
      sql: "select to_regclass('public.profiles') is not null as present",
      source: 'default',
      read_only: true,
    },
  });
  const present = check?.result?.[1]?.[0];
  if (present === true || present === 't') {
    skipSchema = true;
    console.log('Schema already present; skipping SQL. Use --force-schema to re-run it.');
  }
}

if (!skipSchema) {
  console.log(`Applying schema to ${subdomain} (${region})…`);
  const sql = readFileSync(join(root, 'db', 'nhost.sql'), 'utf8');
  const applied = await post('/query', {
    type: 'run_sql',
    args: { sql, source: 'default', read_only: false },
  });
  console.log('  schema:', JSON.stringify(applied).slice(0, 160));
} else {
  console.log('Skipping schema.');
}

const resetPath = join(root, 'db', 'hasura-permissions-reset.json');
if (existsSync(resetPath)) {
  console.log('Resetting role permissions…');
  await applyOps(JSON.parse(readFileSync(resetPath, 'utf8')), 'reset');
}

console.log('Applying tables + owner-only permissions…');
await applyOps(JSON.parse(readFileSync(join(root, 'db', 'hasura-metadata.json'), 'utf8')), 'apply');

console.log('\nDone. Tables are tracked and owner-only permissions are applied.');
